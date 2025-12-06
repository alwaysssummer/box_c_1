import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractVariables } from '@/lib/prompt-utils'
import { handleApiError } from '@/lib/api-utils'

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
    return handleApiError(error, 'Failed to fetch prompts')
  }
}

// POST /api/prompts - 새 프롬프트 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // 프롬프트에서 변수 추출
    const variables = extractVariables(body.content || '')

    // 1. 프롬프트 저장
    const { data: prompt, error } = await supabase
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
        is_question_type: body.isQuestionType || false,
        question_group: body.questionGroup || 'practical',
      })
      .select()
      .single()

    if (error) throw error

    // 2. is_question_type이 true이면 question_types에 자동 생성
    if (body.isQuestionType && prompt) {
      // 같은 이름의 question_type이 있는지 확인
      const { data: existingQt } = await supabase
        .from('question_types')
        .select('id')
        .eq('name', body.name)
        .single()

      if (existingQt) {
        // 기존 것에 prompt_id 연결
        await supabase
          .from('question_types')
          .update({ 
            prompt_id: prompt.id,
            question_group: body.questionGroup || 'practical',
          })
          .eq('id', existingQt.id)
      } else {
        // 새로 생성
        await supabase
          .from('question_types')
          .insert({
            name: body.name,
            description: body.description,
            instruction: '', // 프롬프트에서 생성하므로 빈값
            prompt_id: prompt.id,
            question_group: body.questionGroup || 'practical',
            choice_layout: 'vertical',
            choice_marker: 'circle',
          })
      }
    }

    return NextResponse.json(prompt, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to create prompt')
  }
}
