import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePromptResult, parseIntegratedQuestion, isIntegratedQuestion, isMultiQuestionFormat, parseMultiQuestions } from '@/lib/prompt-parser'
import { injectOutputFormat, QuestionGroup } from '@/lib/slot-system'
import { validateGeneratedContent, shouldRetry, getValidationSummary } from '@/lib/validation'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 재시도 설정
const MAX_RETRY_ATTEMPTS = 2

/**
 * POST /api/generate-question
 * 
 * 프롬프트 직접 생성 모드로 문제를 생성합니다.
 * question_types에 prompt_id가 연결된 경우 사용됩니다.
 * 
 * 자동으로 출력 포맷을 주입하여 일관된 파싱을 보장합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { passageId, questionTypeId } = body
    let { promptId } = body
    
    if (!passageId || !questionTypeId) {
      return NextResponse.json(
        { error: 'passageId, questionTypeId are required' },
        { status: 400 }
      )
    }
    
    // 1. 문제 유형 가져오기 (prompt_id 포함)
    const { data: questionType, error: qtError } = await supabase
      .from('question_types')
      .select('id, name, instruction, choice_layout, choice_marker, prompt_id')
      .eq('id', questionTypeId)
      .single()
    
    if (qtError || !questionType) {
      console.error('Question type error:', qtError)
      return NextResponse.json(
        { error: 'Question type not found' },
        { status: 404 }
      )
    }
    
    // 2. promptId가 없으면 questionType에서 가져오기
    if (!promptId) {
      promptId = questionType.prompt_id
    }
    
    if (!promptId) {
      return NextResponse.json(
        { error: 'This question type has no linked prompt. Please use a prompt-based question type.' },
        { status: 400 }
      )
    }
    
    // 3. 지문 가져오기
    const { data: passage, error: passageError } = await supabase
      .from('passages')
      .select('id, content')
      .eq('id', passageId)
      .single()
    
    if (passageError || !passage) {
      return NextResponse.json(
        { error: 'Passage not found' },
        { status: 404 }
      )
    }
    
    // 4. 프롬프트 가져오기 (question_group 포함)
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('id, name, content, output_schema, question_group')
      .eq('id', promptId)
      .single()
    
    if (promptError || !prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }
    
    // 5. 프롬프트 처리
    // 5a. 플레이스홀더 교체
    let processedPrompt = prompt.content.replace(/\[\[passage\]\]/g, passage.content)
    processedPrompt = processedPrompt.replace(/\{\{passage\}\}/g, passage.content)
    
    // 5b. 출력 포맷 자동 주입 (question_group 기반)
    const questionGroup = (prompt.question_group || 'practical') as QuestionGroup
    processedPrompt = injectOutputFormat(processedPrompt, questionGroup)
    
    // 6. Gemini AI 호출 (재시도 로직 포함)
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')
    const geminiModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: '당신은 영어 교육 전문가입니다. 요청에 따라 문제를 생성하세요. 지문은 반드시 전체를 포함하세요. 출력 형식을 반드시 준수하세요.',
      generationConfig: {
        temperature: 0.3,  // 일관성을 위해 낮춤
        maxOutputTokens: 8192,
      },
    })

    let aiResult = ''
    let validationResult = null
    let attempts = 0
    
    // 재시도 루프
    while (attempts < MAX_RETRY_ATTEMPTS) {
      attempts++
      
      const result = await geminiModel.generateContent(processedPrompt)
      aiResult = result.response.text()
      
      // 검증
      validationResult = validateGeneratedContent(aiResult, questionGroup)
      
      // 검증 통과 또는 재시도 불필요하면 종료
      if (validationResult.isValid || !shouldRetry(validationResult)) {
        break
      }
      
      console.log(`[generate-question] 검증 실패, 재시도 ${attempts}/${MAX_RETRY_ATTEMPTS}: ${getValidationSummary(validationResult)}`)
    }
    
    // 7. 다중 문제 형식 감지
    const isMultiQuestion = isMultiQuestionFormat(aiResult)
    const isIntegrated = isIntegratedQuestion(aiResult)
    
    // 8. 결과 파싱 (첫 번째 문제 또는 단일 문제)
    const parsed = parsePromptResult(aiResult)
    
    // 9. 다중 문제인 경우 모든 문제 파싱
    let subQuestions = null
    if (isMultiQuestion) {
      const multiQuestions = parseMultiQuestions(aiResult)
      if (multiQuestions.length > 0) {
        subQuestions = multiQuestions
        console.log(`[generate-question] 다중 문제 감지: ${multiQuestions.length}개`)
      }
    }
    
    // 10. 통합형(빈칸) 여부 확인
    let blanksData = null
    if (isIntegrated) {
      const integratedData = parseIntegratedQuestion(aiResult)
      if (integratedData) {
        blanksData = integratedData.blanks
      }
    }
    
    // 11. 기존 문제 삭제 후 새로 저장 (같은 passage+questionType 조합이면 덮어쓰기)
    await supabase
      .from('generated_questions')
      .delete()
      .eq('passage_id', passageId)
      .eq('question_type_id', questionTypeId)
    
    // 12. 새 문제 저장
    const insertData: Record<string, unknown> = {
      passage_id: passageId,
      question_type_id: questionTypeId,
      instruction: parsed.instruction || questionType.instruction || '',
      body: parsed.body || '',
      choices: parsed.choices || null,
      answer: parsed.answer || '',
      explanation: parsed.explanation || '',
      status: validationResult?.isValid ? 'completed' : 'warning',
    }
    
    // 다중 문제인 경우 sub_questions에 저장 (DB 마이그레이션 필요)
    // 마이그레이션: supabase/migrations/20241208_add_sub_questions.sql
    if (subQuestions && subQuestions.length > 1) {
      insertData.sub_questions = subQuestions
      insertData.raw_content = aiResult
    }
    
    const { data: savedQuestion, error: saveError } = await supabase
      .from('generated_questions')
      .insert(insertData)
      .select()
      .single()
    
    if (saveError) {
      throw saveError
    }
    
    return NextResponse.json({
      success: true,
      question: savedQuestion,
      validation: validationResult,
      isIntegrated,
      isMultiQuestion,
      subQuestions,
      attempts,
    })
    
  } catch (error) {
    console.error('Error generating question:', error)
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    )
  }
}

