import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractVariables } from '@/lib/prompt-utils'

// GET /api/prompts/[id] - 특정 프롬프트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching prompt:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    )
  }
}

// PUT /api/prompts/[id] - 프롬프트 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    // 프롬프트에서 변수 추출
    const variables = body.content ? extractVariables(body.content) : undefined

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.target !== undefined) updateData.target = body.target
    if (body.content !== undefined) {
      updateData.content = body.content
      updateData.variables = variables
    }
    if (body.outputSchema !== undefined) updateData.output_schema = body.outputSchema
    if (body.sampleInput !== undefined) updateData.sample_input = body.sampleInput
    if (body.sampleOutput !== undefined) updateData.sample_output = body.sampleOutput
    if (body.testPassageId !== undefined) updateData.test_passage_id = body.testPassageId
    if (body.preferredModel !== undefined) updateData.preferred_model = body.preferredModel
    if (body.status !== undefined) updateData.status = body.status
    if (body.lastTestedAt !== undefined) updateData.last_tested_at = body.lastTestedAt

    const { data, error } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    )
  }
}

// DELETE /api/prompts/[id] - 프롬프트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting prompt:', error)
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    )
  }
}
