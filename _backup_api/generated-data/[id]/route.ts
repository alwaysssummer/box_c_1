import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - 단일 생성 데이터 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('generated_data')
      .select(`
        *,
        data_type:data_types(id, name, category),
        passage:passages(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching generated data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generated data' },
      { status: 500 }
    )
  }
}

// PUT - 생성 데이터 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // 수정 가능한 필드만 추출
    const updateData: Record<string, unknown> = {}
    
    if (body.result !== undefined) {
      updateData.result = body.result
    }
    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 데이터가 없습니다' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('generated_data')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error updating generated data:', error)
    return NextResponse.json(
      { error: 'Failed to update generated data' },
      { status: 500 }
    )
  }
}

// DELETE - 생성 데이터 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('generated_data')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Error deleting generated data:', error)
    return NextResponse.json(
      { error: 'Failed to delete generated data' },
      { status: 500 }
    )
  }
}



















