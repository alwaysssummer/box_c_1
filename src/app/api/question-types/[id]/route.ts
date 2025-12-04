import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/question-types/[id] - 특정 문제 유형 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    if (!data) {
      return NextResponse.json(
        { error: 'Question type not found' },
        { status: 404 }
      )
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = data as Record<string, any>
    return NextResponse.json({
      ...responseData,
      dataTypeList: responseData.question_type_items
        ?.sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
        .map((item: { id: string; data_types: { id: string; name: string }; role: string }) => ({
          id: item.id,
          dataTypeId: item.data_types.id,
          dataTypeName: item.data_types.name,
          role: item.role
        })) || []
    })
  } catch (error) {
    console.error('Error fetching question type:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question type' },
      { status: 500 }
    )
  }
}

// PATCH /api/question-types/[id] - 문제 유형 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    // 문제 유형 업데이트
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.instruction !== undefined) updateData.instruction = body.instruction
    if (body.choiceLayout !== undefined) updateData.choice_layout = body.choiceLayout
    if (body.choiceMarker !== undefined) updateData.choice_marker = body.choiceMarker
    
    const { data, error } = await supabase
      .from('question_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // 데이터 유형 항목 업데이트
    if (body.dataTypeList !== undefined) {
      // 기존 항목 삭제
      await supabase
        .from('question_type_items')
        .delete()
        .eq('question_type_id', id)
      
      // 새 항목 추가
      if (body.dataTypeList.length > 0) {
        const items = body.dataTypeList.map((item: { dataTypeId: string; role: string }, idx: number) => ({
          question_type_id: id,
          data_type_id: item.dataTypeId,
          role: item.role || 'body',
          order_index: idx
        }))
        
        await supabase
          .from('question_type_items')
          .insert(items)
      }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateResponseData = data as Record<string, any>
    return NextResponse.json({
      ...updateResponseData,
      dataTypeList: body.dataTypeList || []
    })
  } catch (error) {
    console.error('Error updating question type:', error)
    return NextResponse.json(
      { error: 'Failed to update question type' },
      { status: 500 }
    )
  }
}

// DELETE /api/question-types/[id] - 문제 유형 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('question_types')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting question type:', error)
    return NextResponse.json(
      { error: 'Failed to delete question type' },
      { status: 500 }
    )
  }
}

