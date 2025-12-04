import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/passages/[id] - 특정 지문 조회 (생성된 데이터 포함)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('passages')
      .select(`
        *,
        units (
          id,
          name,
          textbooks (
            id,
            name,
            groups (id, name)
          )
        ),
        generated_data (
          *,
          data_types (id, name, target, has_answer)
        ),
        generated_questions (
          *,
          question_types (id, name)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    if (!data) {
      return NextResponse.json(
        { error: 'Passage not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching passage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch passage' },
      { status: 500 }
    )
  }
}

// PATCH /api/passages/[id] - 지문 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.content !== undefined) updateData.content = body.content
    
    const { data, error } = await supabase
      .from('passages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating passage:', error)
    return NextResponse.json(
      { error: 'Failed to update passage' },
      { status: 500 }
    )
  }
}

// DELETE /api/passages/[id] - 지문 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('passages')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting passage:', error)
    return NextResponse.json(
      { error: 'Failed to delete passage' },
      { status: 500 }
    )
  }
}

