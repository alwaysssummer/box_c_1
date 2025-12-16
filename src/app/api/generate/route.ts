import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBlockContent } from '@/lib/ai-block-generator'
import type { ModelId } from '@/types'

// POST: 문제 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const {
      passage_ids,       // 지문 ID 배열
      question_type_id,  // 문제 유형 ID
      model,             // AI 모델 (선택적)
    } = body
    
    if (!passage_ids || !Array.isArray(passage_ids) || passage_ids.length === 0) {
      return NextResponse.json({ error: 'passage_ids is required' }, { status: 400 })
    }
    
    if (!question_type_id) {
      return NextResponse.json({ error: 'question_type_id is required' }, { status: 400 })
    }
    
    // 1. 문제 유형 조회
    const { data: questionType, error: qtError } = await supabase
      .from('question_types')
      .select('*, block_definitions(*)')
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
    
    // 3. 지문 조회
    const { data: passages, error: passageError } = await supabase
      .from('passages')
      .select('id, name, content')
      .in('id', passage_ids)
    
    if (passageError || !passages || passages.length === 0) {
      return NextResponse.json({ error: 'Passages not found' }, { status: 404 })
    }
    
    // 4. 각 지문에 대해 문제 생성
    const results: Array<{
      passage_id: string
      passage_name: string
      success: boolean
      question_id?: string
      block_instances?: Array<{
        block_id: string
        block_label: string
        content: Record<string, unknown>
      }>
      error?: string
    }> = []
    
    for (const passage of passages) {
      if (!passage.content) {
        results.push({
          passage_id: passage.id,
          passage_name: passage.name,
          success: false,
          error: 'Passage has no content',
        })
        continue
      }
      
      try {
        const blockInstances: Array<{
          block_id: string
          block_label: string
          content: Record<string, unknown>
        }> = []
        
        // 각 블록에 대해 AI 생성
        for (const blockDef of blockDefs) {
          // 기존 블록 인스턴스 확인
          const { data: existingInstance } = await supabase
            .from('block_instances')
            .select('*')
            .eq('block_def_id', blockDef.id)
            .eq('passage_id', passage.id)
            .eq('sentence_index', -1)
            .single()
          
          if (existingInstance?.content && existingInstance.status === 'completed') {
            // 기존 인스턴스 재사용
            blockInstances.push({
              block_id: blockDef.id,
              block_label: blockDef.label,
              content: existingInstance.content as Record<string, unknown>,
            })
            continue
          }
          
          // AI로 새 블록 생성
          const result = await generateBlockContent({
            prompt: blockDef.prompt,
            passage: passage.content,
            model: (model as ModelId) || undefined,
          })
          
          if (!result.success || !result.content) {
            throw new Error(result.error || 'Block generation failed')
          }
          
          // 블록 인스턴스 저장
          const { data: newInstance, error: insertError } = await supabase
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
            .select()
            .single()
          
          if (insertError) {
            console.error('Failed to save block instance:', insertError)
          }
          
          blockInstances.push({
            block_id: blockDef.id,
            block_label: blockDef.label,
            content: result.content,
          })
        }
        
        // 5. 문제 데이터 조합 (블록 정의 기반으로 지문 처리)
        const questionData = extractQuestionData(blockInstances, passage, questionType, blockDefs)
        
        // 6. 생성된 문제 저장
        const { data: question, error: questionError } = await supabase
          .from('generated_questions')
          .insert({
            passage_id: passage.id,
            question_type_id: question_type_id,
            instruction: questionType.instruction,
            body: questionData.body || passage.content,
            choices: questionData.choices,
            answer: questionData.answer,
            explanation: questionData.explanation,
            status: 'completed',
            block_ids: blockInstances.map(b => b.block_id),
          })
          .select()
          .single()
        
        if (questionError) {
          throw new Error(questionError.message)
        }
        
        results.push({
          passage_id: passage.id,
          passage_name: passage.name,
          success: true,
          question_id: question.id,
          block_instances: blockInstances,
        })
        
      } catch (error) {
        results.push({
          passage_id: passage.id,
          passage_name: passage.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    
    // 결과 요약
    const summary = {
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    }
    
    return NextResponse.json({
      success: true,
      summary,
      results,
    })
    
  } catch (error) {
    console.error('Error in POST /api/generate:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// 블록 인스턴스에서 문제 데이터 추출
function extractQuestionData(
  blockInstances: Array<{ block_id: string; block_label: string; content: Record<string, unknown> }>,
  passage: { id: string; name: string; content: string },
  questionType: { layout_config?: Record<string, unknown> },
  blockDefs: Array<{ id: string; modifies_passage?: boolean }>
): {
  body?: string
  choices?: unknown[]
  answer?: string
  explanation?: string
} {
  // 모든 블록 콘텐츠 병합
  const mergedContent: Record<string, unknown> = {}
  for (const instance of blockInstances) {
    Object.assign(mergedContent, instance.content)
  }
  
  // 블록 정의에서 modifies_passage 플래그 확인
  // true인 경우에만 AI 출력 사용 (지문 가공이 필요한 블록)
  // false(기본값)인 경우 원본 지문 사용 (AI 환각 방지)
  const shouldModifyPassage = blockDefs.some(def => def.modifies_passage === true)
  
  let body: string
  if (shouldModifyPassage) {
    // 지문 가공 블록 → AI 출력 사용 (없으면 원본 폴백)
    body = (mergedContent.passage as string) || (mergedContent.body as string) || passage.content
  } else {
    // 일반 블록 → 항상 원본 지문 사용 (안전)
    body = passage.content
  }
  
  return {
    body,
    choices: mergedContent.choices as unknown[] | undefined,
    answer: String(mergedContent.answer ?? ''),
    explanation: (mergedContent.explanation as string) || (mergedContent.해설 as string),
  }
}




