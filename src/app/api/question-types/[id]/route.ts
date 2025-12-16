import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: 단일 문제 유형 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('question_types')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching question type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Question type not found' }, { status: 404 })
    }
    
    // 디버깅: 로드된 데이터 확인
    if (data.output_config?.fields) {
      console.log('[API GET] output_config.fields:', 
        data.output_config.fields.slice(0, 2).map((f: { key: string; showIn?: string[] }) => 
          `${f.key}: showIn=${JSON.stringify(f.showIn)}`
        )
      )
    }
    
    // 블록 정의 정보 추가
    if (data.required_block_ids && data.required_block_ids.length > 0) {
      const { data: blocks } = await supabase
        .from('block_definitions')
        .select('*')
        .in('id', data.required_block_ids)
      
      return NextResponse.json({ ...data, blocks: blocks || [] })
    }
    
    return NextResponse.json({ ...data, blocks: [] })
  } catch (error) {
    console.error('Error in GET /api/question-types/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 문제 유형 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    const {
      name,
      output_type,
      description,
      question_group,
      required_block_ids,
      layout_config,
      output_config,  // 새로운 출력 설정 v2.0
      instruction,
      choice_layout,
      choice_marker,
    } = body
    
    // 업데이트할 필드만 포함
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (output_type !== undefined) updateData.output_type = output_type
    if (description !== undefined) updateData.description = description
    if (question_group !== undefined) updateData.question_group = question_group
    if (required_block_ids !== undefined) updateData.required_block_ids = required_block_ids
    if (layout_config !== undefined) updateData.layout_config = layout_config
    if (output_config !== undefined) updateData.output_config = output_config  // 새로운 출력 설정 저장
    if (instruction !== undefined) updateData.instruction = instruction
    if (choice_layout !== undefined) updateData.choice_layout = choice_layout
    if (choice_marker !== undefined) updateData.choice_marker = choice_marker
    
    // 디버깅 로그
    if (output_config?.fields) {
      console.log('[API PUT] Saving output_config.fields:', 
        output_config.fields.slice(0, 2).map((f: { key: string; showIn?: string[] }) => 
          `${f.key}: showIn=${JSON.stringify(f.showIn)}`
        )
      )
    }
    
    const { data, error } = await supabase
      .from('question_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating question type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 저장 후 데이터 확인
    if (data.output_config?.fields) {
      console.log('[API PUT] Saved output_config.fields:', 
        data.output_config.fields.slice(0, 2).map((f: { key: string; showIn?: string[] }) => 
          `${f.key}: showIn=${JSON.stringify(f.showIn)}`
        )
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/question-types/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 문제 유형 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('question_types')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting question type:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/question-types/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}





