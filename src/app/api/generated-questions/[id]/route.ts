import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/generated-questions/[id]
 * 
 * 특정 생성 문제 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // 문제 삭제
    const { error } = await supabase
      .from('generated_questions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting generated_questions:', error)
      throw new Error('문제 삭제에 실패했습니다')
    }

    return NextResponse.json({
      success: true,
      message: '문제가 삭제되었습니다',
    })

  } catch (error) {
    console.error('Error in DELETE /api/generated-questions/[id]:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete question',
        success: false 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/generated-questions/[id]
 * 
 * 특정 생성 문제 조회 (미리보기 기능에서 사용)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
      .from('generated_questions')
      .select(`
        id,
        passage_id,
        question_type_id,
        instruction,
        body,
        choices,
        answer,
        explanation,
        status,
        error_message,
        created_at,
        question_type:question_types (
          id,
          name,
          output_type,
          question_group,
          layout_config,
          output_config
        ),
        passage:passages (
          id,
          name,
          content,
          korean_translation,
          unit:units (
            id,
            name,
            textbook:textbooks (
              id,
              name
            )
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching generated_questions:', error)
      throw new Error('문제를 찾을 수 없습니다')
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in GET /api/generated-questions/[id]:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch question',
      },
      { status: 404 }
    )
  }
}

