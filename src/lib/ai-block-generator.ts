import { AI_MODELS, type ModelId } from '@/types'
import { normalizeOutputFields, type OutputField } from '@/types/database'

// AI 프로바이더별 SDK import
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

// 환경 변수에서 API 키 가져오기
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null
const google = process.env.GOOGLE_GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY) : null

// 블록 생성 요청 타입
export interface BlockGenerateRequest {
  prompt: string
  passage: string
  model?: ModelId
  variables?: Record<string, string>
  outputFields?: Array<{ key: string; type?: string; sample?: unknown }> | string[]  // ⭐ 문자열 배열도 허용
}

// 블록 생성 결과 타입
export interface BlockGenerateResult {
  success: boolean
  content?: Record<string, unknown>
  rawContent?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  responseTime: number
  model: string
}

// 기본 모델
export function getDefaultModel(): ModelId {
  return 'gemini-2.0-flash'
}

// 프롬프트 빌드 (변수 치환 포함)
export function buildPrompt(template: string, variables: Record<string, string>): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
    result = result.replace(regex, value)
  }
  
  return result
}

// JSON 출력 규칙 추가
function addJsonOutputRules(
  prompt: string, 
  outputFields?: Array<{ key: string; type?: string; sample?: unknown }> | string[]
): string {
  let fieldsInstruction = ''
  
  if (outputFields && outputFields.length > 0) {
    // ⭐ normalizeOutputFields로 모든 형식 통일 처리
    const normalizedFields = normalizeOutputFields(outputFields as (string | OutputField)[])
    
    const fieldList = normalizedFields.map(f => {
      const type = f.type || 'text'
      let typeDesc = '문자열'
      if (type === 'array') typeDesc = '배열'
      else if (type === 'number') typeDesc = '숫자'
      else if (type === 'boolean') typeDesc = '불리언'
      
      // 샘플 값이 있으면 표시
      const sampleStr = f.sample ? ` (예: ${JSON.stringify(f.sample).substring(0, 50)})` : ''
      return `  - "${f.key}": ${typeDesc}${sampleStr}`
    }).join('\n')
    
    fieldsInstruction = `
## 필수 출력 필드
다음 필드들을 반드시 JSON에 포함하세요:
${fieldList}
`
  }

  return `${prompt}
${fieldsInstruction}
## 출력 형식
반드시 유효한 JSON 형식으로만 응답하세요.
- 설명이나 추가 텍스트 없이 순수 JSON만 출력
- 위에 명시된 필드 키를 정확히 사용
- 문자열 값은 적절히 이스케이프 처리
`
}

// AI 호출 및 블록 생성
export async function generateBlockContent(request: BlockGenerateRequest): Promise<BlockGenerateResult> {
  const startTime = Date.now()
  const model = request.model || getDefaultModel()
  const modelInfo = AI_MODELS[model]
  
  if (!modelInfo) {
    return {
      success: false,
      error: `Unknown model: ${model}`,
      responseTime: Date.now() - startTime,
      model,
    }
  }
  
  // 변수 치환
  const variables = {
    passage: request.passage,
    ...request.variables,
  }
  const finalPrompt = addJsonOutputRules(
    buildPrompt(request.prompt, variables),
    request.outputFields
  )
  
  try {
    let rawContent = ''
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    
    // 프로바이더별 API 호출
    switch (modelInfo.provider) {
      case 'openai': {
        if (!openai) {
          throw new Error('OpenAI API key not configured')
        }
        const response = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: finalPrompt }],
          response_format: { type: 'json_object' },
        })
        rawContent = response.choices[0]?.message?.content || ''
        usage = {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        }
        break
      }
      
      case 'anthropic': {
        if (!anthropic) {
          throw new Error('Anthropic API key not configured')
        }
        const response = await anthropic.messages.create({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: finalPrompt }],
        })
        rawContent = response.content[0]?.type === 'text' ? response.content[0].text : ''
        usage = {
          inputTokens: response.usage?.input_tokens || 0,
          outputTokens: response.usage?.output_tokens || 0,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        }
        break
      }
      
      case 'google': {
        if (!google) {
          throw new Error('Google Gemini API key not configured - .env.local에 GOOGLE_GEMINI_API_KEY를 설정하세요')
        }
        const genModel = google.getGenerativeModel({ model })
        const response = await genModel.generateContent(finalPrompt)
        rawContent = response.response.text()
        // Google API doesn't return token counts in the same way
        usage = {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        }
        break
      }
    }
    
    // JSON 파싱 시도
    let content: Record<string, unknown> = {}
    try {
      // JSON 블록 추출 시도
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                        rawContent.match(/```\s*([\s\S]*?)\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : rawContent
      content = JSON.parse(jsonString.trim())
    } catch (parseError) {
      // JSON 파싱 실패 시 raw content 반환
      return {
        success: true,
        rawContent,
        usage,
        responseTime: Date.now() - startTime,
        model,
      }
    }
    
    return {
      success: true,
      content,
      rawContent,
      usage,
      responseTime: Date.now() - startTime,
      model,
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: errorMessage,
      responseTime: Date.now() - startTime,
      model,
    }
  }
}

// 출력 필드 자동 감지
export function detectOutputFields(content: Record<string, unknown>): Array<{
  key: string
  type: 'text' | 'array' | 'number' | 'boolean' | 'object'
  sample?: unknown
}> {
  const fields: Array<{
    key: string
    type: 'text' | 'array' | 'number' | 'boolean' | 'object'
    sample?: unknown
  }> = []
  
  for (const [key, value] of Object.entries(content)) {
    let type: 'text' | 'array' | 'number' | 'boolean' | 'object' = 'text'
    
    if (Array.isArray(value)) {
      type = 'array'
    } else if (typeof value === 'number') {
      type = 'number'
    } else if (typeof value === 'boolean') {
      type = 'boolean'
    } else if (typeof value === 'object' && value !== null) {
      type = 'object'
    }
    
    // 샘플 값 (너무 길면 자르기)
    let sample = value
    if (typeof value === 'string' && value.length > 100) {
      sample = value.substring(0, 100) + '...'
    } else if (Array.isArray(value) && value.length > 3) {
      sample = value.slice(0, 3)
    }
    
    fields.push({ key, type, sample })
  }
  
  return fields
}

