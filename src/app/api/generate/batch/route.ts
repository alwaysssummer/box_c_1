import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBlockContent } from '@/lib/ai-block-generator'
import { normalizeOutputFields } from '@/types/database'
import type { ModelId } from '@/types'

// 동시 처리 수 제한
const CONCURRENT_LIMIT = 3
// 재시도 횟수
const MAX_RETRIES = 2

// 필수 필드 검증 - normalizeOutputFields 사용
function validateContent(
  content: Record<string, unknown>,
  outputFields: Array<{ key: string; type?: string }> | string[] | null | undefined
): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'object') {
    return { valid: false, error: 'Invalid JSON response' }
  }
  
  if (!outputFields || !Array.isArray(outputFields) || outputFields.length === 0) {
    return { valid: true } // 필드 검증 없이 통과
  }
  
  // ⭐ normalizeOutputFields로 모든 형식 통일 처리
  const fields = normalizeOutputFields(outputFields)
  
  for (const field of fields) {
    if (content[field.key] === undefined) {
      return { valid: false, error: `Missing field: ${field.key}` }
    }
  }
  
  // choices 필드가 있으면 배열인지, 길이가 적절한지 확인
  if (content.choices !== undefined) {
    if (!Array.isArray(content.choices)) {
      return { valid: false, error: 'choices must be an array' }
    }
    if (content.choices.length < 2) {
      return { valid: false, error: 'choices must have at least 2 items' }
    }
  }
  
  // answer 필드가 있으면 유효한 값인지 확인
  if (content.answer !== undefined && content.choices) {
    const answer = typeof content.answer === 'number' 
      ? content.answer 
      : parseInt(String(content.answer))
    if (isNaN(answer) || answer < 1 || answer > (content.choices as unknown[]).length) {
      return { valid: false, error: `Invalid answer: ${content.answer}` }
    }
  }
  
  return { valid: true }
}

// 단일 지문 처리 (재시도 포함) - 항상 새로 생성
async function processPassage(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  passage: { id: string; name: string; content: string; units?: { name: string } },
  blockDef: {
    id: string
    label: string
    prompt: string
    prompt_version: number
    output_fields: Array<{ key: string; type?: string }> | string[]
  },
  model?: ModelId
): Promise<{
  passage_id: string
  passage_name: string
  passage_content: string
  unit_name?: string
  textbook_name?: string  // ⭐ 교재명 추가
  success: boolean
  content?: Record<string, unknown>
  error?: string
}> {
  let lastError = ''
  
  console.log(`[Generate] Processing passage: ${passage.name} (${passage.id})`)
  console.log(`[Generate] Passage content preview: ${passage.content?.substring(0, 100)}...`)
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 항상 AI를 호출하여 새로 생성 (캐시 사용 안함)
      console.log(`[Generate] Generating new content for passage: ${passage.name} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
      
      // output_fields 정규화 (문자열화된 JSON 포함)
      const normalizedFields = (blockDef.output_fields || []).map(f => {
        // 문자열인 경우
        if (typeof f === 'string') {
          // JSON 문자열인지 확인
          if (f.startsWith('{') && f.includes('"key"')) {
            try {
              const parsed = JSON.parse(f)
              return parsed
            } catch {
              return { key: f, type: 'text' }
            }
          }
          return { key: f, type: 'text' }
        }
        return f
      })
      
      const result = await generateBlockContent({
        prompt: blockDef.prompt,
        passage: passage.content,
        model: model || undefined,
        outputFields: normalizedFields as Array<{ key: string; type?: string; sample?: unknown }>,
      })
      
      if (!result.success || !result.content) {
        lastError = result.error || 'AI generation failed'
        console.log(`[Generate] Failed - no content. Error: ${lastError}`)
        if (result.rawContent) {
          console.log(`[Generate] Raw content preview: ${result.rawContent.substring(0, 200)}...`)
        }
        continue // 재시도
      }
      
      // 3. 필수 필드 검증
      console.log(`[Generate] Content keys: ${Object.keys(result.content).join(', ')}`)
      const validation = validateContent(result.content, blockDef.output_fields)
      if (!validation.valid) {
        lastError = validation.error || 'Validation failed'
        console.log(`[Generate] Validation failed: ${lastError}`)
        console.log(`[Generate] Expected fields: ${JSON.stringify(blockDef.output_fields)}`)
        continue // 재시도
      }
      
      // 4. 캐시 저장
      await supabase
        .from('block_instances')
        .upsert({
          block_def_id: blockDef.id,
          passage_id: passage.id,
          sentence_index: -1,
          content: result.content,
          status: 'completed',
          generated_with_version: blockDef.prompt_version,
          model_used: result.model,
          tokens_used: result.usage?.totalTokens || 0,
        }, {
          onConflict: 'block_def_id,passage_id,sentence_index',
        })
      
      return {
        passage_id: passage.id,
        passage_name: passage.name,
        passage_content: passage.content,  // 원본 지문 포함
        unit_name: passage.units?.name,  // 단원명
        textbook_name: passage.units?.textbooks?.name,  // ⭐ 교재명 추가
        success: true,
        content: result.content,
      }
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
    }
  }
  
  // 모든 재시도 실패
  return {
    passage_id: passage.id,
    passage_name: passage.name,
    passage_content: passage.content,  // 원본 지문 포함
    unit_name: passage.units?.name,  // 단원명
    textbook_name: passage.units?.textbooks?.name,  // ⭐ 교재명 추가
    success: false,
    error: lastError,
  }
}

// 병렬 처리 (동시 처리 수 제한)
async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
  }
  
  return results
}

// POST: 배치 문제 생성 (SSE 스트리밍)
export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
    const {
      passage_ids,       // 지문 ID 배열
      question_type_id,  // 문제 유형 ID
      model,             // AI 모델 (선택적)
    } = body
    
    console.log('[Generate Batch] Request:', { 
      passage_ids, 
      question_type_id, 
      passage_count: passage_ids?.length 
    })
    
    if (!passage_ids || !Array.isArray(passage_ids) || passage_ids.length === 0) {
      return NextResponse.json({ error: 'passage_ids is required' }, { status: 400 })
    }
    
    if (!question_type_id) {
      return NextResponse.json({ error: 'question_type_id is required' }, { status: 400 })
    }
    
    // 1. 문제 유형 조회
    const { data: questionType, error: qtError } = await supabase
      .from('question_types')
      .select('*')
      .eq('id', question_type_id)
      .single()
    
    if (qtError || !questionType) {
      return NextResponse.json({ error: 'Question type not found' }, { status: 404 })
    }
    
    // 2. 블록 정의 가져오기
    const blockIds = questionType.required_block_ids || []
    if (blockIds.length === 0) {
      return NextResponse.json({ error: 'No blocks defined for this question type' }, { status: 400 })
    }
    
    const { data: blockDefs, error: blockError } = await supabase
      .from('block_definitions')
      .select('*')
      .in('id', blockIds)
    
    if (blockError || !blockDefs || blockDefs.length === 0) {
      return NextResponse.json({ error: 'Block definitions not found' }, { status: 404 })
    }
    
    // 첫 번째 블록만 사용 (1문제유형 = 1블록)
    const blockDef = blockDefs[0]
    
    // 3. 지문 조회 (단원 정보 + 교재 정보 포함)
    const { data: passages, error: passageError } = await supabase
      .from('passages')
      .select(`
        id, 
        name, 
        content,
        units!inner(
          name,
          textbooks!inner(
            name
          )
        )
      `)
      .in('id', passage_ids)
    
    if (passageError || !passages || passages.length === 0) {
      return NextResponse.json({ error: 'Passages not found' }, { status: 404 })
    }
    
    // ID 순서 유지
    const passageMap = new Map(passages.map(p => [p.id, p]))
    const orderedPassages = passage_ids
      .map(id => passageMap.get(id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined && p.content !== null)
    
    // ⭐ SSE 스트리밍 응답 생성
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 초기 메타데이터 전송
          const metadata = {
            type: 'metadata',
            total: orderedPassages.length,
            question_type_id,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`))
          
          // 각 지문을 순차적으로 처리하며 실시간 전송
          for (let i = 0; i < orderedPassages.length; i++) {
            const passage = orderedPassages[i]
            
            try {
              const result = await processPassage(
                supabase,
                passage as { id: string; name: string; content: string },
                blockDef,
                model as ModelId
              )
              
              // 성공 결과 전송
              const data = {
                type: 'result',
                index: i,
                ...result,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
              
            } catch (error) {
              // 오류 결과 전송
              const errorData = {
                type: 'result',
                index: i,
                passage_id: passage.id,
                passage_name: passage.name,
                unit_name: passage.units?.name,
                textbook_name: passage.units?.textbooks?.name,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
            }
          }
          
          // 완료 메시지 전송
          const complete = { type: 'complete' }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(complete)}\n\n`))
          controller.close()
          
        } catch (error) {
          console.error('[SSE Stream] Error:', error)
          const errorMsg = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream error',
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMsg)}\n\n`))
          controller.close()
        }
      },
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
    
  } catch (error) {
    console.error('Error in POST /api/generate/batch:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

