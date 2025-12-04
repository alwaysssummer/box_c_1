import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SupabaseError {
  code?: string
  message?: string
}

// PUT /api/textbooks/reorder - 교재 순서 변경
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { textbooks } = body as { textbooks: { id: string; order_index: number }[] }

    if (!textbooks || !Array.isArray(textbooks)) {
      return NextResponse.json(
        { error: 'Textbooks array is required' },
        { status: 400 }
      )
    }

    // 각 교재의 order_index 업데이트
    for (const textbook of textbooks) {
      const { error } = await supabase
        .from('textbooks')
        .update({ order_index: textbook.order_index })
        .eq('id', textbook.id)

      if (error) {
        // order_index 컬럼이 없는 경우 명확한 에러 메시지
        const supabaseError = error as SupabaseError
        if (supabaseError.code === 'PGRST204' || supabaseError.code === '42703') {
          return NextResponse.json(
            { error: 'order_index 컬럼이 없습니다. DB 마이그레이션을 실행해주세요.' },
            { status: 400 }
          )
        }
        throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering textbooks:', error)
    return NextResponse.json(
      { error: 'Failed to reorder textbooks' },
      { status: 500 }
    )
  }
}



