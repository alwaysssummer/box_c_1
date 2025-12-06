import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parsePromptResult } from '@/lib/prompt-parser'
import { injectOutputFormat, QuestionGroup } from '@/lib/slot-system'
import { GoogleGenerativeAI } from '@google/generative-ai'

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
    
    const { passageId, questionTypeId, promptId } = body
    
    if (!passageId || !questionTypeId || !promptId) {
      return NextResponse.json(
        { error: 'passageId, questionTypeId, promptId are required' },
        { status: 400 }
      )
    }
    
    // 1. 지문 가져오기
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
    
    // 2. 프롬프트 가져오기 (question_group 포함)
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
    
    // 3. 문제 유형 가져오기
    const { data: questionType, error: qtError } = await supabase
      .from('question_types')
      .select('id, name, instruction, choice_layout, choice_marker')
      .eq('id', questionTypeId)
      .single()
    
    if (qtError || !questionType) {
      console.error('Question type error:', qtError)
      return NextResponse.json(
        { error: 'Question type not found' },
        { status: 404 }
      )
    }
    
    // 4. 프롬프트 처리
    // 4a. 플레이스홀더 교체
    let processedPrompt = prompt.content.replace(/\[\[passage\]\]/g, passage.content)
    processedPrompt = processedPrompt.replace(/\{\{passage\}\}/g, passage.content)
    
    // 4b. 출력 포맷 자동 주입 (question_group 기반)
    const questionGroup = (prompt.question_group || 'practical') as QuestionGroup
    processedPrompt = injectOutputFormat(processedPrompt, questionGroup)
    
    // 5. Gemini AI 호출
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')
    const geminiModel = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      systemInstruction: '당신은 영어 교육 전문가입니다. 요청에 따라 문제를 생성하세요.',
      generationConfig: {
        temperature: 0.5,
      },
    })

    const result = await geminiModel.generateContent(processedPrompt)
    const aiResult = result.response.text()
    
    // 6. 결과 파싱
    const parseResult = parsePromptResult(aiResult)
    const parsed = parseResult.data
    
    // 7. generated_questions에 저장
    const { data: savedQuestion, error: saveError } = await supabase
      .from('generated_questions')
      .insert({
        passage_id: passageId,
        question_type_id: questionTypeId,
        instruction: (parsed.instruction as string) || questionType.instruction || '',
        body: (parsed.body as string) || '',
        choices: parsed.choices || null,
        answer: (parsed.answer as string) || '',
        explanation: (parsed.explanation as string) || '',
        status: 'completed',
      })
      .select()
      .single()
    
    if (saveError) {
      throw saveError
    }
    
    return NextResponse.json({
      success: true,
      question: savedQuestion,
    })
    
  } catch (error) {
    console.error('Error generating question:', error)
    return NextResponse.json(
      { error: 'Failed to generate question' },
      { status: 500 }
    )
  }
}

