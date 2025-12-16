import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/print-layouts/[id] - 특정 레이아웃 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('print_layouts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    if (!data) {
      return NextResponse.json(
        { error: 'Print layout not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching print layout:', error)
    return NextResponse.json(
      { error: 'Failed to fetch print layout' },
      { status: 500 }
    )
  }
}

// PATCH /api/print-layouts/[id] - 레이아웃 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    // 기본 레이아웃으로 설정 시 기존 기본값 해제
    if (body.is_default) {
      // 현재 레이아웃의 카테고리 확인
      const { data: current } = await supabase
        .from('print_layouts')
        .select('category')
        .eq('id', id)
        .single()
      
      if (current) {
        await supabase
          .from('print_layouts')
          .update({ is_default: false })
          .eq('category', current.category)
          .eq('is_default', true)
          .neq('id', id)
      }
    }
    
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.config !== undefined) updateData.config = body.config
    if (body.style !== undefined) updateData.style = body.style
    if (body.is_default !== undefined) updateData.is_default = body.is_default
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order
    
    const { data, error } = await supabase
      .from('print_layouts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating print layout:', error)
    return NextResponse.json(
      { error: 'Failed to update print layout' },
      { status: 500 }
    )
  }
}

// DELETE /api/print-layouts/[id] - 레이아웃 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // 사용 중인지 확인
    const { count } = await supabase
      .from('question_types')
      .select('id', { count: 'exact', head: true })
      .eq('print_layout_id', id)
    
    if (count && count > 0) {
      return NextResponse.json(
        { error: `이 레이아웃을 사용 중인 문제 유형이 ${count}개 있습니다. 먼저 문제 유형에서 레이아웃을 변경해주세요.` },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('print_layouts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting print layout:', error)
    return NextResponse.json(
      { error: 'Failed to delete print layout' },
      { status: 500 }
    )
  }
}

