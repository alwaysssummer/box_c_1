import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/prompts/[id]/test-history - 프롬프트 테스트 기록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data, error } = await supabase
      .from('prompt_test_history')
      .select('*')
      .eq('prompt_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching test history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test history' },
      { status: 500 }
    )
  }
}

// POST /api/prompts/[id]/test-history - 테스트 기록 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabase
      .from('prompt_test_history')
      .insert({
        prompt_id: id,
        model: body.model,
        input_text: body.inputText,
        output_text: body.outputText,
        success: body.success,
        error_message: body.errorMessage,
        response_time: body.responseTime,
        input_tokens: body.inputTokens,
        output_tokens: body.outputTokens,
      })
      .select()
      .single()

    if (error) throw error

    // 프롬프트의 last_tested_at 업데이트
    await supabase
      .from('prompts')
      .update({ last_tested_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating test history:', error)
    return NextResponse.json(
      { error: 'Failed to create test history' },
      { status: 500 }
    )
  }
}




