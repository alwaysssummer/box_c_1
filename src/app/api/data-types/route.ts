import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/data-types - 모든 데이터 유형 조회
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('data_types')
      .select(`
        *,
        data_type_dependencies!data_type_dependencies_data_type_id_fkey (
          depends_on_id
        )
      `)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    
    // 의존성 데이터 변환
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = data.map((dt: Record<string, any>) => ({
      ...dt,
      dependsOn: dt.data_type_dependencies?.map((d: { depends_on_id: string }) => d.depends_on_id) || []
    }))
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching data types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data types' },
      { status: 500 }
    )
  }
}

// POST /api/data-types - 새 데이터 유형 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Data type name is required' },
        { status: 400 }
      )
    }
    
    // 데이터 유형 생성
    const { data: dataType, error: dataTypeError } = await supabase
      .from('data_types')
      .insert({
        name: body.name.trim(),
        target: body.target || 'passage',
        prompt_id: body.promptId || null,
        prompt: body.prompt || null,
        output_schema: body.outputSchema ? JSON.parse(body.outputSchema) : null,
        sample_result: body.sampleResult || null,
        has_answer: body.hasAnswer || false,
        answer_format: body.answerFormat || null,
        has_dependency: body.hasDependency || false,
        difficulty: body.difficulty || 'medium',
        recommended_model: body.recommendedModel || 'gpt-4o-mini',
      })
      .select()
      .single()
    
    if (dataTypeError) throw dataTypeError
    
    // 의존성 생성
    if (body.dependsOn && body.dependsOn.length > 0) {
      const dependencies = body.dependsOn.map((depId: string) => ({
        data_type_id: dataType.id,
        depends_on_id: depId
      }))
      
      const { error: depError } = await supabase
        .from('data_type_dependencies')
        .insert(dependencies)
      
      if (depError) throw depError
    }
    
    return NextResponse.json({
      ...dataType,
      dependsOn: body.dependsOn || []
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating data type:', error)
    return NextResponse.json(
      { error: 'Failed to create data type' },
      { status: 500 }
    )
  }
}

