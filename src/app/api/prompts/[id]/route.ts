import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 프롬프트에서 변수 추출 ({{variable}} 형식)
function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }
  return variables
}

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

    // 기존 프롬프트 정보 조회 (is_question_type 상태 변경 감지용)
    const { data: existingPrompt } = await supabase
      .from('prompts')
      .select('name, is_question_type')
      .eq('id', id)
      .single()

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
    if (body.isQuestionType !== undefined) updateData.is_question_type = body.isQuestionType
    if (body.questionGroup !== undefined) updateData.question_group = body.questionGroup

    const { data: prompt, error } = await supabase
      .from('prompts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // is_question_type 상태 변경에 따른 question_types 동기화
    const wasQuestionType = existingPrompt?.is_question_type || false
    const isQuestionType = body.isQuestionType ?? wasQuestionType
    const promptName = body.name ?? existingPrompt?.name

    console.log('[Prompt PUT] Question type sync:', {
      wasQuestionType,
      isQuestionType,
      bodyIsQuestionType: body.isQuestionType,
      promptName,
    })

    if (isQuestionType && !wasQuestionType) {
      // false → true: question_types 생성
      const { data: existingQt } = await supabase
        .from('question_types')
        .select('id')
        .eq('prompt_id', id)
        .single()

      if (!existingQt) {
        // 같은 이름으로 검색
        const { data: sameNameQt } = await supabase
          .from('question_types')
          .select('id')
          .eq('name', promptName)
          .single()

        if (sameNameQt) {
          // 기존 것에 prompt_id 연결
          await supabase
            .from('question_types')
            .update({ 
              prompt_id: id,
              question_group: body.questionGroup || 'practical',
            })
            .eq('id', sameNameQt.id)
        } else {
          // 새로 생성 (prompt_id, question_group 컬럼이 없을 수 있으므로 별도 처리)
          console.log('[Prompt PUT] Creating new question_type:', {
            name: promptName,
            prompt_id: id,
            question_group: body.questionGroup || 'practical',
          })
          
          // 기본 데이터로 먼저 생성
          const insertData: Record<string, unknown> = {
            name: promptName,
            description: body.description,
            choice_layout: 'vertical',
            choice_marker: 'circle',
          }
          
          const { data: newQt, error: insertError } = await supabase
            .from('question_types')
            .insert(insertData)
            .select()
            .single()
          
          if (insertError) {
            console.error('[Prompt PUT] Failed to create question_type:', insertError)
          } else {
            console.log('[Prompt PUT] Question type created:', newQt?.id)
            
            // prompt_id와 question_group 업데이트 시도 (컬럼이 있으면 성공, 없으면 무시)
            try {
              await supabase
                .from('question_types')
                .update({
                  prompt_id: id,
                  question_group: body.questionGroup || 'practical',
                })
                .eq('id', newQt.id)
            } catch (updateErr) {
              console.log('[Prompt PUT] Could not update prompt_id/question_group (columns may not exist)')
            }
          }
        }
      }
    } else if (!isQuestionType && wasQuestionType) {
      // true → false: question_types에서 prompt_id 제거 (또는 삭제)
      await supabase
        .from('question_types')
        .delete()
        .eq('prompt_id', id)
    } else if (isQuestionType && body.name && body.name !== existingPrompt?.name) {
      // 이름 변경 시 question_types 이름도 동기화
      await supabase
        .from('question_types')
        .update({ name: body.name })
        .eq('prompt_id', id)
    }

    return NextResponse.json(prompt)
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

    // 1. 연결된 question_types 삭제 (프롬프트 기반 문제 유형)
    await supabase
      .from('question_types')
      .delete()
      .eq('prompt_id', id)

    // 2. 프롬프트 삭제
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
