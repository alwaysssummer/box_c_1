import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/passages/[id] - 지문 상세 조회 (문장 포함)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('passages')
      .select(`
        *,
        sentences (*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Passage not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // 문장 순서 정렬
    if (data.sentences) {
      data.sentences.sort((a: { sentence_no: number }, b: { sentence_no: number }) => 
        a.sentence_no - b.sentence_no
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
