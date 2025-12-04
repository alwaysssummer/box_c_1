import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createDetailedError, getAlternativeModel } from '@/lib/ai-errors'

// AI 모델 정의
export const AI_MODELS = {
  // OpenAI
  'gpt-4o': { provider: 'openai', name: 'GPT-4o', description: '최신 고성능 모델' },
  'gpt-4o-mini': { provider: 'openai', name: 'GPT-4o Mini', description: '빠르고 저렴' },
  'gpt-3.5-turbo': { provider: 'openai', name: 'GPT-3.5 Turbo', description: '가장 저렴' },
  // Anthropic
  'claude-3-5-sonnet-20241022': { provider: 'anthropic', name: 'Claude 3.5 Sonnet', description: '고성능' },
  'claude-3-haiku-20240307': { provider: 'anthropic', name: 'Claude 3 Haiku', description: '빠름' },
  // Google
  'gemini-1.5-pro': { provider: 'google', name: 'Gemini 1.5 Pro', description: '고성능, 긴 컨텍스트' },
  'gemini-2.0-flash': { provider: 'google', name: '⚡ Gemini 2.0 Flash (추천)', description: '빠르고 저렴한 추천 모델' },
  'gemini-2.5-flash': { provider: 'google', name: '🚀 Gemini 2.5 Flash (최신)', description: '최신 고속 모델' },
} as const

type ModelId = keyof typeof AI_MODELS

interface TestPromptRequest {
  model: ModelId
  systemPrompt?: string
  userPrompt: string
  sampleInput: string
  outputSchema?: string
}

interface AIErrorDetail {
  type: string
  message: string
  solution: string
  severity?: string
  canRetry: boolean
  alternativeModel?: string | null
}

interface TestPromptResponse {
  success: boolean
  result?: string
  error?: string
  aiError?: AIErrorDetail  // 상세 에러 정보
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  responseTime: number
  model: string
}

// 프롬프트에서 변수 치환
function replaceVariables(prompt: string, sampleInput: string): string {
  return prompt
    .replace(/\[\[passage\]\]/g, sampleInput)
    .replace(/\[\[sentence\]\]/g, sampleInput)
    .replace(/\[\[korean\]\]/g, sampleInput)
    .replace(/\[\[input\]\]/g, sampleInput)
}

// OpenAI 호출
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
    temperature: 0.7,
  })

  return {
    result: response.choices[0]?.message?.content || '',
    usage: {
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
    },
  }
}

// Anthropic 호출
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

// Google Gemini 호출
async function callGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: string; usage: { inputTokens: number; outputTokens: number } }> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')
  const geminiModel = genAI.getGenerativeModel({ 
    model,
    systemInstruction: systemPrompt,
  })

  const result = await geminiModel.generateContent(userPrompt)
  const response = result.response
  
  // Gemini는 토큰 사용량을 다르게 제공
  const usageMetadata = response.usageMetadata
  
  return {
    result: response.text(),
    usage: {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
    },
  }
}

// POST /api/test-prompt - 프롬프트 테스트
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let model: string = ''
  
  try {
    const body: TestPromptRequest = await request.json()
    const { systemPrompt, userPrompt, sampleInput, outputSchema } = body
    model = body.model

    if (!model || !userPrompt || !sampleInput) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다 (model, userPrompt, sampleInput)' },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelInfo = (AI_MODELS as any)[model] as { provider: string; name: string; description: string } | undefined
    if (!modelInfo) {
      return NextResponse.json(
        { success: false, error: `지원하지 않는 모델입니다: ${model}` },
        { status: 400 }
      )
    }

    // 변수 치환
    const processedPrompt = replaceVariables(userPrompt, sampleInput)
    
    // 시스템 프롬프트 구성
    let finalSystemPrompt = systemPrompt || '당신은 영어 교육 전문가입니다.'
    if (outputSchema) {
      finalSystemPrompt += `\n\n반드시 다음 JSON 스키마 형식으로 응답하세요:\n${outputSchema}`
    }

    let result: { result: string; usage: { inputTokens: number; outputTokens: number } }

    // 제공업체별 호출
    switch (modelInfo.provider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY가 설정되지 않았습니다')
        }
        result = await callOpenAI(model, finalSystemPrompt, processedPrompt)
        break
        
      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다')
        }
        result = await callAnthropic(model, finalSystemPrompt, processedPrompt)
        break
        
      case 'google':
        if (!process.env.GOOGLE_GEMINI_API_KEY) {
          throw new Error('GOOGLE_GEMINI_API_KEY가 설정되지 않았습니다')
        }
        result = await callGemini(model, finalSystemPrompt, processedPrompt)
        break
        
      default:
        throw new Error(`알 수 없는 제공업체: ${modelInfo.provider}`)
    }

    const responseTime = Date.now() - startTime

    const response: TestPromptResponse = {
      success: true,
      result: result.result,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.inputTokens + result.usage.outputTokens,
      },
      responseTime,
      model: modelInfo.name,
    }

    return NextResponse.json(response)
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    // 상세 에러 분류
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailedError = createDetailedError(error, {
      model,
      provider: (AI_MODELS as any)[model]?.provider,
      action: 'prompt-test'
    })
    
    // 대안 모델 추천
    const alternativeModel = model ? getAlternativeModel(model, detailedError.errorInfo.type) : null
    
    console.error('Prompt test error:', {
      errorType: detailedError.errorInfo.type,
      message: detailedError.errorInfo.message,
      originalError: detailedError.originalError,
      model,
    })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelName = (AI_MODELS as any)[model]?.name || ''
    return NextResponse.json({
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
      responseTime,
      model: modelName,
    })
  }
}

// GET /api/test-prompt - 사용 가능한 모델 목록
export async function GET() {
  const models = Object.entries(AI_MODELS).map(([id, info]) => ({
    id,
    ...info,
    available: (() => {
      switch (info.provider) {
        case 'openai': return !!process.env.OPENAI_API_KEY
        case 'anthropic': return !!process.env.ANTHROPIC_API_KEY
        case 'google': return !!process.env.GOOGLE_GEMINI_API_KEY
        default: return false
      }
    })(),
  }))

  return NextResponse.json({ models })
}



