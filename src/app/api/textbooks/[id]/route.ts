import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/textbooks/[id] - 특정 교재 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('textbooks')
      .select(`
        *,
        units (
          *,
          passages (*)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    if (!data) {
      return NextResponse.json(
        { error: 'Textbook not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching textbook:', error)
    return NextResponse.json(
      { error: 'Failed to fetch textbook' },
      { status: 500 }
    )
  }
}

// PATCH /api/textbooks/[id] - 교재 수정 (그룹 이동 포함)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    const updateData: Record<string, unknown> = {}
    if (body.name) updateData.name = body.name
    if (body.group_id) updateData.group_id = body.group_id
    if (body.google_sheet_url !== undefined) updateData.google_sheet_url = body.google_sheet_url
    
    const { data, error } = await supabase
      .from('textbooks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating textbook:', error)
    return NextResponse.json(
      { error: 'Failed to update textbook' },
      { status: 500 }
    )
  }
}

// DELETE /api/textbooks/[id] - 교재 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('textbooks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting textbook:', error)
    return NextResponse.json(
      { error: 'Failed to delete textbook' },
      { status: 500 }
    )
  }
}

