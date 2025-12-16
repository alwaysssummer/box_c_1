import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 출력 템플릿 입력 타입 (레거시 호환용)
interface OutputTemplateInput {
  name: string
  category: string
  config: Record<string, unknown>
  is_default?: boolean
}

// GET /api/output-templates/[id] - 특정 템플릿 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('output_templates')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching output template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch output template' },
      { status: 500 }
    )
  }
}

// PUT /api/output-templates/[id] - 템플릿 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body: Partial<OutputTemplateInput> = await request.json()
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    
    if (body.name !== undefined) {
      updateData.name = body.name.trim()
    }
    if (body.category !== undefined) {
      if (!['passage', 'sentence'].includes(body.category)) {
        return NextResponse.json(
          { error: 'Valid category (passage or sentence) is required' },
          { status: 400 }
        )
      }
      updateData.category = body.category
    }
    if (body.config !== undefined) {
      updateData.config = body.config
    }
    if (body.is_default !== undefined) {
      updateData.is_default = body.is_default
    }
    
    const { data, error } = await supabase
      .from('output_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }
      throw error
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating output template:', error)
    return NextResponse.json(
      { error: 'Failed to update output template' },
      { status: 500 }
    )
  }
}

// DELETE /api/output-templates/[id] - 템플릿 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // 이 템플릿을 사용하는 문제유형이 있는지 확인
    const { count } = await supabase
      .from('question_types')
      .select('*', { count: 'exact', head: true })
      .eq('output_template_id', id)
    
    if (count && count > 0) {
      return NextResponse.json(
        { error: `이 템플릿을 사용하는 문제유형이 ${count}개 있습니다. 먼저 연결을 해제해주세요.` },
        { status: 400 }
      )
    }
    
    const { error } = await supabase
      .from('output_templates')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting output template:', error)
    return NextResponse.json(
      { error: 'Failed to delete output template' },
      { status: 500 }
    )
  }
}






