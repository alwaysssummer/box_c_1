import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PUT /api/units/reorder - 단원 순서 변경
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // body.units: [{ id: string, order_index: number }]
    if (!body.units || !Array.isArray(body.units)) {
      return NextResponse.json(
        { error: 'Units array is required' },
        { status: 400 }
      )
    }

    // 각 단원의 순서 업데이트
    const updates = body.units.map(
      (unit: { id: string; order_index: number }) =>
        supabase
          .from('units')
          .update({ order_index: unit.order_index })
          .eq('id', unit.id)
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering units:', error)
    return NextResponse.json(
      { error: 'Failed to reorder units' },
      { status: 500 }
    )
  }
}











