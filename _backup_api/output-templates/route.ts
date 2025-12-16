import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 출력 템플릿 입력 타입 (레거시 호환용)
interface OutputTemplateInput {
  name: string
  category: string
  config: Record<string, unknown>
  is_default?: boolean
}

// GET /api/output-templates - 모든 출력 템플릿 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('output_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching output templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch output templates' },
      { status: 500 }
    )
  }
}

// POST /api/output-templates - 새 출력 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: OutputTemplateInput = await request.json()
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }
    
    if (!body.category || !['passage', 'sentence'].includes(body.category)) {
      return NextResponse.json(
        { error: 'Valid category (passage or sentence) is required' },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from('output_templates')
      .insert({
        name: body.name.trim(),
        category: body.category,
        config: body.config || {},
        is_default: body.is_default || false,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating output template:', error)
    return NextResponse.json(
      { error: 'Failed to create output template' },
      { status: 500 }
    )
  }
}






