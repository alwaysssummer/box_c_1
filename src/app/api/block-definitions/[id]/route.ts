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

// GET: 단일 블록 정의 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('block_definitions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching block definition:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Block definition not found' }, { status: 404 })
    }
    
    console.log('[API GET block-definitions] Loaded output_fields:', {
      id: data.id,
      label: data.label,
      count: data.output_fields?.length,
      sample: data.output_fields?.slice(0, 2)
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/block-definitions/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 블록 정의 수정
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    const {
      label,
      type,
      unit,
      prompt,
      output_fields,
      description,
      is_active,
      modifies_passage,
    } = body
    
    console.log('[API PUT block-definitions] Received output_fields:', {
      count: output_fields?.length,
      sample: output_fields?.slice(0, 2)
    })
    
    // 업데이트할 필드만 포함
    const updateData: Record<string, unknown> = {}
    if (label !== undefined) updateData.label = label
    if (type !== undefined) updateData.type = type
    if (unit !== undefined) updateData.unit = unit
    if (prompt !== undefined) {
      // {{ passage }} 플레이스홀더 필수 검증
      const placeholderValidation = validatePassagePlaceholder(prompt)
      if (!placeholderValidation.valid) {
        return NextResponse.json({ error: placeholderValidation.error }, { status: 400 })
      }
      
      updateData.prompt = prompt
      // 프롬프트 변경 시 버전 증가
      const { data: current } = await supabase
        .from('block_definitions')
        .select('prompt_version')
        .eq('id', id)
        .single()
      if (current) {
        updateData.prompt_version = (current.prompt_version || 1) + 1
      }
    }
    if (output_fields !== undefined) updateData.output_fields = output_fields
    if (description !== undefined) updateData.description = description
    if (is_active !== undefined) updateData.is_active = is_active
    if (modifies_passage !== undefined) updateData.modifies_passage = modifies_passage
    
    const { data, error } = await supabase
      .from('block_definitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating block definition:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('[API PUT block-definitions] Saved output_fields:', {
      count: data.output_fields?.length,
      sample: data.output_fields?.slice(0, 2)
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in PUT /api/block-definitions/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 블록 정의 삭제
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('block_definitions')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting block definition:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/block-definitions/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



