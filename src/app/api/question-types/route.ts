import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_LAYOUT_CONFIG } from '@/types/database'
import { DEFAULT_OUTPUT_CONFIG } from '@/types/output-config'

// GET: 문제 유형 목록 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('question_types')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching question types:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 블록 정의 정보 추가 (required_block_ids 기반)
    const questionTypesWithBlocks = await Promise.all(
      (data || []).map(async (qt) => {
        if (qt.required_block_ids && qt.required_block_ids.length > 0) {
          const { data: blocks } = await supabase
            .from('block_definitions')
            .select('*')
            .in('id', qt.required_block_ids)
          
          return { ...qt, blocks: blocks || [] }
        }
        return { ...qt, blocks: [] }
      })
    )
    
    return NextResponse.json(questionTypesWithBlocks)
  } catch (error) {
    console.error('Error in GET /api/question-types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 새 문제 유형 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const {
      name,
      output_type = 'question',
      description,
      question_group = 'csat',
      required_block_ids = [],
      layout_config = DEFAULT_LAYOUT_CONFIG,
      output_config,  // 새로운 출력 설정 v2.0
      instruction,
      choice_layout,
      choice_marker,
    } = body
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    // output_config가 제공되지 않으면 기본값 사용
    const finalOutputConfig = output_config || DEFAULT_OUTPUT_CONFIG
    
    const { data, error } = await supabase
      .from('question_types')
      .insert({
        name,
        output_type,
        description,
        question_group,
        required_block_ids,
        layout_config,
        output_config: finalOutputConfig,  // 새로운 출력 설정 저장
        instruction,
        choice_layout: choice_layout || layout_config.choice_layout || finalOutputConfig.options?.choiceLayout || 'vertical',
        choice_marker: choice_marker || layout_config.choice_marker || 'number_circle',
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating question type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/question-types:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





