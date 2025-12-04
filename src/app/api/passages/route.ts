import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/passages - 모든 지문 조회 (그룹/교재/단원 정보 포함)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // 필터 파라미터
    const groupId = searchParams.get('groupId')
    const textbookId = searchParams.get('textbookId')
    const unitId = searchParams.get('unitId')
    
    let query = supabase
      .from('passages')
      .select(`
        id,
        name,
        content,
        order_index,
        units (
          id,
          name,
          textbooks (
            id,
            name,
            groups (
              id,
              name
            )
          )
        )
      `)
      .order('order_index', { ascending: true })
    
    // 단원 ID로 필터
    if (unitId) {
      query = query.eq('unit_id', unitId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // 교재 ID나 그룹 ID로 추가 필터링 (Supabase nested filter 제한으로 인해 클라이언트에서 처리)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let filteredData: any[] = data || []
    
    if (textbookId) {
      filteredData = filteredData.filter(
        (p) => p.units?.textbooks?.id === textbookId
      )
    }
    
    if (groupId) {
      filteredData = filteredData.filter(
        (p) => p.units?.textbooks?.groups?.id === groupId
      )
    }
    
    // 계층 구조로 변환하여 반환
    const structured = filteredData.map((passage) => ({
      id: passage.id,
      name: passage.name,
      content: passage.content,
      orderIndex: passage.order_index,
      unit: passage.units ? {
        id: passage.units.id,
        name: passage.units.name,
      } : null,
      textbook: passage.units?.textbooks ? {
        id: passage.units.textbooks.id,
        name: passage.units.textbooks.name,
      } : null,
      group: passage.units?.textbooks?.groups ? {
        id: passage.units.textbooks.groups.id,
        name: passage.units.textbooks.groups.name,
      } : null,
    }))
    
    return NextResponse.json(structured)
  } catch (error) {
    console.error('Error fetching passages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch passages' },
      { status: 500 }
    )
  }
}






