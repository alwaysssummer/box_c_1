import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { createDetailedError, getAlternativeModel } from '@/lib/ai-errors'

// AI 모델 정의 (test-prompt와 동일)
export const AI_MODELS = {
  'gpt-4o': { provider: 'openai', name: 'GPT-4o', description: '최신 고성능 모델' },
  'gpt-4o-mini': { provider: 'openai', name: 'GPT-4o Mini', description: '빠르고 저렴' },
  'gpt-3.5-turbo': { provider: 'openai', name: 'GPT-3.5 Turbo', description: '가장 저렴' },
  'claude-3-5-sonnet-20241022': { provider: 'anthropic', name: 'Claude 3.5 Sonnet', description: '고성능' },
  'claude-3-haiku-20240307': { provider: 'anthropic', name: 'Claude 3 Haiku', description: '빠름' },
  'gemini-1.5-pro': { provider: 'google', name: 'Gemini 1.5 Pro', description: '고성능, 긴 컨텍스트' },
  'gemini-2.0-flash': { provider: 'google', name: '⚡ Gemini 2.0 Flash (추천)', description: '빠르고 저렴한 추천 모델' },
  'gemini-2.5-flash': { provider: 'google', name: '🚀 Gemini 2.5 Flash (최신)', description: '최신 고속 모델' },
} as const

type ModelId = keyof typeof AI_MODELS

// ============================================
// 요청/응답 타입
// ============================================

interface GenerateDataRequest {
  passageId: string          // 지문 ID
  sentenceId?: string | null // 문장 ID (문장 단위 생성 시)
  dataTypeId: string         // 데이터 유형 ID
  model?: ModelId            // AI 모델 (미지정 시 데이터 유형의 추천 모델 사용)
}

interface GenerateDataResponse {
  success: boolean
  data?: {
    id: string
    passageId: string
    sentenceId: string | null
    dataTypeId: string
    result: unknown
    status: string
    modelUsed: string
    confidence: number | null
    responseTime: number
    inputTokens: number
    outputTokens: number
  }
  error?: string
  aiError?: {
    type: string
    message: string
    solution: string
    severity?: string
    canRetry: boolean
    alternativeModel?: string | null
  }
}

// ============================================
// AI 호출 함수들
// ============================================

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: string; usage: { inputTokens: number; outputTokens: number } }> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3, // 데이터 생성은 낮은 temperature로 일관성 유지
    response_format: { type: 'json_object' },
  })

  return {
    result: response.choices[0]?.message?.content || '',
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    },
  }
}

async function callAnthropic(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: string; usage: { inputTokens: number; outputTokens: number } }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textContent = response.content.find((c) => c.type === 'text')
  
  return {
    result: textContent?.type === 'text' ? textContent.text : '',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

async function callGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: string; usage: { inputTokens: number; outputTokens: number } }> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')
  const geminiModel = genAI.getGenerativeModel({ 
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    },
  })

  const result = await geminiModel.generateContent(userPrompt)
  const response = result.response
  const usageMetadata = response.usageMetadata
  
  return {
    result: response.text(),
    usage: {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
    },
  }
}

// ============================================
// 변수 치환
// ============================================

function replaceVariables(
  prompt: string, 
  passage: { content: string; korean_translation: string | null },
  sentence?: { content: string; korean_translation: string | null }
): string {
  let result = prompt
  
  // 지문 변수
  result = result.replace(/\[\[passage\]\]/g, passage.content || '')
  result = result.replace(/\[\[korean\]\]/g, passage.korean_translation || '')
  
  // 문장 변수 (문장 단위 생성 시)
  if (sentence) {
    result = result.replace(/\[\[sentence\]\]/g, sentence.content || '')
    result = result.replace(/\[\[sentence_korean\]\]/g, sentence.korean_translation || '')
  }
  
  return result
}

// ============================================
// POST /api/generate-data - 데이터 생성
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const supabase = await createClient()
  
  try {
    const body: GenerateDataRequest = await request.json()
    const { passageId, sentenceId, dataTypeId, model: requestedModel } = body

    // 필수 필드 검증
    if (!passageId || !dataTypeId) {
      return NextResponse.json<GenerateDataResponse>(
        { success: false, error: '필수 필드가 누락되었습니다 (passageId, dataTypeId)' },
        { status: 400 }
      )
    }

    // 1. 데이터 유형 조회 (프롬프트 정보 포함)
    const { data: dataType, error: dataTypeError } = await supabase
      .from('data_types')
      .select(`
        *,
        prompt:prompts!data_types_prompt_id_fkey (
          id,
          content,
          output_schema,
          variables
        )
      `)
      .eq('id', dataTypeId)
      .single()

    if (dataTypeError || !dataType) {
      return NextResponse.json<GenerateDataResponse>(
        { success: false, error: '데이터 유형을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 2. 프롬프트 확인
    const promptContent = dataType.prompt?.content || dataType.prompt
    if (!promptContent) {
      return NextResponse.json<GenerateDataResponse>(
        { success: false, error: '데이터 유형에 연결된 프롬프트가 없습니다' },
        { status: 400 }
      )
    }

    // 3. 지문 조회
    const { data: passage, error: passageError } = await supabase
      .from('passages')
      .select('id, content, korean_translation')
      .eq('id', passageId)
      .single()

    if (passageError || !passage) {
      return NextResponse.json<GenerateDataResponse>(
        { success: false, error: '지문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 4. 문장 조회 (문장 단위 생성 시)
    let sentence = null
    if (sentenceId) {
      const { data: sentenceData, error: sentenceError } = await supabase
        .from('sentences')
        .select('id, content, korean_translation')
        .eq('id', sentenceId)
        .single()

      if (sentenceError || !sentenceData) {
        return NextResponse.json<GenerateDataResponse>(
          { success: false, error: '문장을 찾을 수 없습니다' },
          { status: 404 }
        )
      }
      sentence = sentenceData
    }

    // 5. 모델 결정
    const model = requestedModel || (dataType.recommended_model as ModelId) || 'gpt-4o-mini'
    const modelInfo = AI_MODELS[model]
    
    if (!modelInfo) {
      return NextResponse.json<GenerateDataResponse>(
        { success: false, error: `지원하지 않는 모델입니다: ${model}` },
        { status: 400 }
      )
    }

    // 6. 프롬프트 처리
    const processedPrompt = replaceVariables(promptContent, passage, sentence || undefined)
    
    // 시스템 프롬프트 구성
    let systemPrompt = '당신은 영어 교육 전문가입니다. 반드시 JSON 형식으로만 응답하세요.'
    const outputSchema = dataType.prompt?.output_schema || dataType.output_schema
    if (outputSchema) {
      systemPrompt += `\n\n다음 JSON 스키마를 엄격히 따르세요:\n${typeof outputSchema === 'string' ? outputSchema : JSON.stringify(outputSchema, null, 2)}`
    }

    // 7. AI 호출
    let aiResult: { result: string; usage: { inputTokens: number; outputTokens: number } }

    switch (modelInfo.provider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY가 설정되지 않았습니다')
        }
        aiResult = await callOpenAI(model, systemPrompt, processedPrompt)
        break
        
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다')
        }
        aiResult = await callAnthropic(model, systemPrompt, processedPrompt)
        break
        
      case 'google':
        if (!process.env.GOOGLE_GEMINI_API_KEY) {
          throw new Error('GOOGLE_GEMINI_API_KEY가 설정되지 않았습니다')
        }
        aiResult = await callGemini(model, systemPrompt, processedPrompt)
        break
        
      default:
        throw new Error(`알 수 없는 제공업체: ${modelInfo.provider}`)
    }

    const responseTime = Date.now() - startTime

    // 8. JSON 파싱
    let parsedResult: unknown
    try {
      parsedResult = JSON.parse(aiResult.result)
    } catch {
      // JSON 파싱 실패 시 원본 텍스트 저장
      parsedResult = { raw_text: aiResult.result }
    }

    // 9. DB에 저장 (UPSERT)
    const { data: savedData, error: saveError } = await supabase
      .from('generated_data')
      .upsert({
        passage_id: passageId,
        sentence_id: sentenceId || null,
        data_type_id: dataTypeId,
        result: parsedResult,
        status: 'completed',
        model_used: model,
        confidence: 0.95, // TODO: AI 응답에서 신뢰도 추출
        response_time: responseTime,
        input_tokens: aiResult.usage.inputTokens,
        output_tokens: aiResult.usage.outputTokens,
        error_message: null,
      }, {
        onConflict: 'passage_id,data_type_id,sentence_id',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving generated data:', saveError)
      // 저장 실패해도 결과는 반환
    }

    return NextResponse.json<GenerateDataResponse>({
      success: true,
      data: {
        id: savedData?.id || '',
        passageId,
        sentenceId: sentenceId || null,
        dataTypeId,
        result: parsedResult,
        status: 'completed',
        modelUsed: model,
        confidence: 0.95,
        responseTime,
        inputTokens: aiResult.usage.inputTokens,
        outputTokens: aiResult.usage.outputTokens,
      },
    })

  } catch (error) {
    const responseTime = Date.now() - startTime
    
    // 에러 정보 추출
    const body = await request.clone().json().catch(() => ({}))
    const model = body.model || 'gpt-4o-mini'
    
    // 상세 에러 분류
    const detailedError = createDetailedError(error, {
      model,
      provider: AI_MODELS[model as ModelId]?.provider,
      action: 'data-generation'
    })
    
    const alternativeModel = getAlternativeModel(model, detailedError.errorInfo.type)
    
    console.error('Data generation error:', {
      errorType: detailedError.errorInfo.type,
      message: detailedError.errorInfo.message,
      originalError: detailedError.originalError,
      model,
    })

    // 실패 상태로 DB 저장 시도
    if (body.passageId && body.dataTypeId) {
      const supabase = await createClient()
      await supabase
        .from('generated_data')
        .upsert({
          passage_id: body.passageId,
          sentence_id: body.sentenceId || null,
          data_type_id: body.dataTypeId,
          status: 'failed',
          error_message: detailedError.errorInfo.message,
          model_used: model,
          response_time: responseTime,
        }, {
          onConflict: 'passage_id,data_type_id,sentence_id',
          ignoreDuplicates: false,
        })
    }
    
    return NextResponse.json<GenerateDataResponse>({
      success: false,
      error: `${detailedError.errorInfo.icon} ${detailedError.errorInfo.message}`,
      aiError: {
        type: detailedError.errorInfo.type,
        message: detailedError.errorInfo.message,
        solution: detailedError.errorInfo.solution,
        severity: detailedError.errorInfo.severity,
        canRetry: detailedError.errorInfo.canRetry,
        alternativeModel,
      },
    })
  }
}

// ============================================
// GET /api/generate-data - 생성된 데이터 조회
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const passageId = searchParams.get('passageId')
    const dataTypeId = searchParams.get('dataTypeId')
    const status = searchParams.get('status')
    
    let query = supabase
      .from('generated_data')
      .select(`
        *,
        passage:passages!generated_data_passage_id_fkey (
          id, name, content
        ),
        data_type:data_types!generated_data_data_type_id_fkey (
          id, name, target
        ),
        sentence:sentences!generated_data_sentence_id_fkey (
          id, sentence_no, content
        )
      `)
      .order('created_at', { ascending: false })
    
    if (passageId) {
      query = query.eq('passage_id', passageId)
    }
    
    if (dataTypeId) {
      query = query.eq('data_type_id', dataTypeId)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true, data })
    
  } catch (error) {
    console.error('Error fetching generated data:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch generated data' },
      { status: 500 }
    )
  }
}

