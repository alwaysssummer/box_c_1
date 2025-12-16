import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 출력 레이아웃 타입 (레거시 호환용)
interface PrintLayoutInput {
  name: string
  description?: string
  category: 'passage' | 'sentence'
  config: Record<string, unknown>
  style?: Record<string, unknown>
  is_default?: boolean
  sort_order?: number
}

// GET /api/print-layouts - 모든 출력 레이아웃 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    let query = supabase
      .from('print_layouts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    
    // 카테고리 필터
    if (category) {
      query = query.eq('category', category)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching print layouts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch print layouts' },
      { status: 500 }
    )
  }
}

// POST /api/print-layouts - 새 출력 레이아웃 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: PrintLayoutInput = await request.json()
    
    // 기본 레이아웃으로 설정 시 기존 기본값 해제
    if (body.is_default) {
      await supabase
        .from('print_layouts')
        .update({ is_default: false })
        .eq('category', body.category)
        .eq('is_default', true)
    }
    
    const { data, error } = await supabase
      .from('print_layouts')
      .insert({
        name: body.name,
        description: body.description,
        category: body.category,
        config: body.config,
        style: body.style || {},
        is_default: body.is_default || false,
        sort_order: body.sort_order || 0,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating print layout:', error)
    return NextResponse.json(
      { error: 'Failed to create print layout' },
      { status: 500 }
    )
  }
}

