import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/prompts - 모든 프롬프트 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    let query = supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching prompts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

// POST /api/prompts - 새 프롬프트 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // 프롬프트에서 변수 추출
    const variables = extractVariables(body.content || '')

    const { data, error } = await supabase
      .from('prompts')
      .insert({
        name: body.name,
        description: body.description,
        category: body.category || 'general',
        target: body.target || 'passage',
        content: body.content,
        variables: variables,
        output_schema: body.outputSchema,
        sample_input: body.sampleInput,
        sample_output: body.sampleOutput,
        test_passage_id: body.testPassageId,
        preferred_model: body.preferredModel || 'gpt-4o-mini',
        status: body.status || 'draft',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating prompt:', error)
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    )
  }
}

// 프롬프트에서 변수 추출 함수
function extractVariables(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || []
  return [...new Set(matches.map((m) => m.replace(/\[\[|\]\]/g, '')))]
}




