import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SupabaseError {
  code?: string
  message?: string
}

// PUT /api/groups/reorder - 그룹 순서 변경
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { groups } = body as { groups: { id: string; order_index: number }[] }

    if (!groups || !Array.isArray(groups)) {
      return NextResponse.json(
        { error: 'Groups array is required' },
        { status: 400 }
      )
    }

    // 각 그룹의 order_index 업데이트
    for (const group of groups) {
      const { error } = await supabase
        .from('groups')
        .update({ order_index: group.order_index })
        .eq('id', group.id)

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
    console.error('Error reordering groups:', error)
    return NextResponse.json(
      { error: 'Failed to reorder groups' },
      { status: 500 }
    )
  }
}

