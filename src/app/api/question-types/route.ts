import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/question-types - 모든 문제 유형 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('question_types')
      .select(`
        *,
        question_type_items (
          *,
          data_types (id, name, target, has_answer)
        )
      `)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    // 데이터 변환
    const result = data.map(qt => ({
      ...qt,
      dataTypeList: qt.question_type_items
        ?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        .map((item: { id: string; data_types: { id: string; name: string }; role: string }) => ({
          id: item.id,
          dataTypeId: item.data_types.id,
          dataTypeName: item.data_types.name,
          role: item.role
        })) || []
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching question types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question types' },
      { status: 500 }
    )
  }
}

// POST /api/question-types - 새 문제 유형 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Question type name is required' },
        { status: 400 }
      )
    }
    
    // 문제 유형(출력 유형) 생성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: questionType, error: qtError } = await (supabase as any)
      .from('question_types')
      .insert({
        name: body.name.trim(),
        description: body.description || null,
        instruction: body.instruction || null,
        purpose: body.purpose || 'assessment',
        passage_transform: body.passageTransform || {},
        output_config: body.outputConfig || {
          requiresAnswer: true,
          requiresExplanation: true,
          answerFormat: 'single',
          choiceCount: 5
        },
        extends_from: body.extendsFrom || null,
        choice_layout: body.choiceLayout || 'vertical',
        choice_marker: body.choiceMarker || 'circle'
      })
      .select()
      .single()
    
    if (qtError) throw qtError
    
    // 데이터 유형 항목 생성
    if (body.dataTypeList && body.dataTypeList.length > 0) {
      const items = body.dataTypeList.map((item: { dataTypeId: string; role: string; config?: object; required?: boolean }, idx: number) => ({
        question_type_id: questionType.id,
        data_type_id: item.dataTypeId,
        role: item.role || 'body',
        order_index: idx,
        config: item.config || {},
        required: item.required !== false
      }))
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: itemsError } = await (supabase as any)
        .from('question_type_items')
        .insert(items)
      
      if (itemsError) throw itemsError
    }
    
    return NextResponse.json({
      ...questionType,
      dataTypeList: body.dataTypeList || []
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating question type:', error)
    return NextResponse.json(
      { error: 'Failed to create question type' },
      { status: 500 }
    )
  }
}

