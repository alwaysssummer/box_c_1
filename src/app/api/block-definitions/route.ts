import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// {{ passage }} 플레이스홀더 검증 함수
function validatePassagePlaceholder(prompt: string): { valid: boolean; error?: string } {
  const hasPlaceholder = /\{\{\s*passage\s*\}\}/i.test(prompt)
  if (!hasPlaceholder) {
    return {
      valid: false,
      error: '프롬프트에 {{ passage }} 플레이스홀더가 필요합니다. 이 위치에 실제 지문 내용이 삽입됩니다.'
    }
  }
  return { valid: true }
}

// GET: 블록 정의 목록 조회
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // 필터 옵션
    const type = searchParams.get('type') // 'single' | 'bundle'
    const unit = searchParams.get('unit') // 'passage' | 'sentence'
    const active = searchParams.get('active') // 'true' | 'false'
    
    let query = supabase
      .from('block_definitions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (type) {
      query = query.eq('type', type)
    }
    if (unit) {
      query = query.eq('unit', unit)
    }
    if (active !== null) {
      query = query.eq('is_active', active === 'true')
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching block definitions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/block-definitions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 새 블록 정의 생성
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const {
      label,
      type = 'bundle',
      unit = 'passage',
      prompt,
      output_fields = [],
      description,
      is_active = true,
      modifies_passage = false,
    } = body
    
    if (!label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    
    // {{ passage }} 플레이스홀더 필수 검증
    const placeholderValidation = validatePassagePlaceholder(prompt)
    if (!placeholderValidation.valid) {
      return NextResponse.json({ error: placeholderValidation.error }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('block_definitions')
      .insert({
        label,
        type,
        unit,
        prompt,
        output_fields,
        description,
        is_active,
        modifies_passage,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating block definition:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/block-definitions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



