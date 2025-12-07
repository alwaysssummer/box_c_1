import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - 특정 지문의 생성된 데이터 및 문제 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: passageId } = await params
    const supabase = await createClient()

    // 지문 기본 정보
    const { data: passage, error: passageError } = await supabase
      .from('passages')
      .select(`
        id,
        name,
        content,
        korean_translation,
        sentence_split_status,
        sentence_count,
        unit:units(
          id,
          name,
          textbook:textbooks(
            id,
            name,
            group:groups(id, name)
          )
        )
      `)
      .eq('id', passageId)
      .single()

    if (passageError) {
      return NextResponse.json({ error: passageError.message }, { status: 404 })
    }

    // 생성된 데이터 조회
    const { data: generatedData, error: dataError } = await supabase
      .from('generated_data')
      .select(`
        id,
        passage_id,
        data_type_id,
        result,
        status,
        model_used,
        confidence,
        response_time,
        error_message,
        created_at,
        data_type:data_types(id, name, category, target)
      `)
      .eq('passage_id', passageId)
      .order('created_at', { ascending: false })

    if (dataError) {
      console.error('Error fetching generated data:', dataError)
    }

    // 생성된 문제 조회 (레이아웃 정보 포함)
    const { data: generatedQuestions, error: questionsError } = await supabase
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
        question_type:question_types(id, name, purpose, choice_layout, choice_marker)
      `)
      .eq('passage_id', passageId)
      .order('created_at', { ascending: false })

    if (questionsError) {
      console.error('Error fetching generated questions:', questionsError)
    }

    // 모든 데이터 유형 조회 (생성 가능 여부 표시용)
    const { data: allDataTypes } = await supabase
      .from('data_types')
      .select('id, name, category, target')
      .order('name')

    // 모든 문제 유형 조회
    const { data: allQuestionTypes } = await supabase
      .from('question_types')
      .select('id, name, purpose')
      .order('name')

    return NextResponse.json({
      passage,
      generatedData: generatedData || [],
      generatedQuestions: generatedQuestions || [],
      allDataTypes: allDataTypes || [],
      allQuestionTypes: allQuestionTypes || [],
    })
  } catch (error) {
    console.error('Error fetching passage generated content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch passage generated content' },
      { status: 500 }
    )
  }
}

// DELETE - 지문의 모든 생성된 데이터 및 문제 삭제 (전체 삭제)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: passageId } = await params
    const supabase = await createClient()

    // 삭제 전 개수 확인
    const { count: dataCount } = await supabase
      .from('generated_data')
      .select('*', { count: 'exact', head: true })
      .eq('passage_id', passageId)

    const { count: questionCount } = await supabase
      .from('generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('passage_id', passageId)

    // 생성된 데이터 삭제
    const { error: dataError } = await supabase
      .from('generated_data')
      .delete()
      .eq('passage_id', passageId)

    if (dataError) {
      console.error('Error deleting generated data:', dataError)
      return NextResponse.json(
        { error: 'Failed to delete generated data' },
        { status: 500 }
      )
    }

    // 생성된 문제 삭제
    const { error: questionsError } = await supabase
      .from('generated_questions')
      .delete()
      .eq('passage_id', passageId)

    if (questionsError) {
      console.error('Error deleting generated questions:', questionsError)
      return NextResponse.json(
        { error: 'Failed to delete generated questions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted: {
        data: dataCount || 0,
        questions: questionCount || 0,
      },
      message: `데이터 ${dataCount || 0}개, 문제 ${questionCount || 0}개가 삭제되었습니다.`
    })
  } catch (error) {
    console.error('Error deleting passage generated content:', error)
    return NextResponse.json(
      { error: 'Failed to delete passage generated content' },
      { status: 500 }
    )
  }
}
