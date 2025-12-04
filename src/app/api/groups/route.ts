import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/groups - 모든 그룹 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    // order_index 컬럼이 있는지 먼저 시도, 없으면 created_at으로 정렬
    let { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
    
    // order_index 컬럼이 없는 경우 fallback
    if (error && error.code === '42703') {
      const fallbackResult = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: true })
      
      data = fallbackResult.data
      error = fallbackResult.error
    }
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}

// POST /api/groups - 새 그룹 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }
    
    // order_index 컬럼이 있는지 확인하고 새 그룹 추가
    let newOrderIndex: number | undefined
    try {
      const { data: maxOrderData } = await supabase
        .from('groups')
        .select('order_index')
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
      
      newOrderIndex = (maxOrderData?.order_index ?? -1) + 1
    } catch {
      // order_index 컬럼이 없으면 무시
      newOrderIndex = undefined
    }
    
    const insertData: { name: string; order_index?: number } = { 
      name: body.name.trim(),
    }
    
    if (newOrderIndex !== undefined) {
      insertData.order_index = newOrderIndex
    }
    
    const { data, error } = await supabase
      .from('groups')
      .insert(insertData)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}

