import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/data-types/[id] - 특정 데이터 유형 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('data_types')
      .select(`
        *,
        data_type_dependencies!data_type_dependencies_data_type_id_fkey (
          depends_on_id
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    if (!data) {
      return NextResponse.json(
        { error: 'Data type not found' },
        { status: 404 }
      )
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = data as Record<string, any>
    return NextResponse.json({
      ...responseData,
      dependsOn: responseData.data_type_dependencies?.map((d: { depends_on_id: string }) => d.depends_on_id) || []
    })
  } catch (error) {
    console.error('Error fetching data type:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data type' },
      { status: 500 }
    )
  }
}

// PATCH /api/data-types/[id] - 데이터 유형 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()
    
    // 데이터 유형 업데이트
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.target !== undefined) updateData.target = body.target
    if (body.promptId !== undefined) updateData.prompt_id = body.promptId
    if (body.prompt !== undefined) updateData.prompt = body.prompt
    if (body.outputSchema !== undefined) {
      updateData.output_schema = body.outputSchema ? JSON.parse(body.outputSchema) : null
    }
    if (body.sampleResult !== undefined) updateData.sample_result = body.sampleResult
    if (body.hasAnswer !== undefined) updateData.has_answer = body.hasAnswer
    if (body.answerFormat !== undefined) updateData.answer_format = body.answerFormat
    if (body.hasDependency !== undefined) updateData.has_dependency = body.hasDependency
    if (body.difficulty !== undefined) updateData.difficulty = body.difficulty
    if (body.recommendedModel !== undefined) updateData.recommended_model = body.recommendedModel
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('data_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    // 의존성 업데이트
    if (body.dependsOn !== undefined) {
      // 기존 의존성 삭제
      await supabase
        .from('data_type_dependencies')
        .delete()
        .eq('data_type_id', id)
      
      // 새 의존성 추가
      if (body.dependsOn.length > 0) {
        const dependencies = body.dependsOn.map((depId: string) => ({
          data_type_id: id,
          depends_on_id: depId
        }))
        
        await supabase
          .from('data_type_dependencies')
          .insert(dependencies)
      }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = data as Record<string, any>
    return NextResponse.json({
      ...responseData,
      dependsOn: body.dependsOn || []
    })
  } catch (error) {
    console.error('Error updating data type:', error)
    return NextResponse.json(
      { error: 'Failed to update data type' },
      { status: 500 }
    )
  }
}

// DELETE /api/data-types/[id] - 데이터 유형 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('data_types')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting data type:', error)
    return NextResponse.json(
      { error: 'Failed to delete data type' },
      { status: 500 }
    )
  }
}

