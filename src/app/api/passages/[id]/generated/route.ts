import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/passages/[id]/generated
 * 
 * 특정 지문의 생성된 데이터와 문제를 조회
 * 문제관리 > 지문 상세 패널에서 사용
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: passageId } = await params

    // 1. 지문 정보 조회
    const { data: passage, error: passageError } = await supabase
      .from('passages')
      .select(`
        id,
        name,
        content,
        korean_translation,
        sentence_split_status,
        sentence_count,
        unit:units (
          id,
          name,
          textbook:textbooks (
            id,
            name,
            group:groups (
              id,
              name
            )
          )
        )
      `)
      .eq('id', passageId)
      .single()

    if (passageError) {
      console.error('Error fetching passage:', passageError)
      throw new Error('지문을 찾을 수 없습니다')
    }

    // 2. 생성된 데이터 조회
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
        data_type:data_types (
          id,
          name,
          category,
          target
        )
      `)
      .eq('passage_id', passageId)
      .order('created_at', { ascending: false })

    if (dataError) {
      console.error('Error fetching generated data:', dataError)
    }

    // 3. 생성된 문제 조회
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
        question_type:question_types (
          id,
          name,
          output_type
        )
      `)
      .eq('passage_id', passageId)
      .order('created_at', { ascending: false })

    if (questionsError) {
      console.error('Error fetching generated questions:', questionsError)
    }

    // 4. 모든 데이터 유형 목록 조회 (비교용)
    const { data: allDataTypes, error: dataTypesError } = await supabase
      .from('data_types')
      .select('id, name, category, target')
      .order('name')

    if (dataTypesError) {
      console.error('Error fetching data types:', dataTypesError)
    }

    // 5. 모든 문제 유형 목록 조회 (비교용)
    const { data: allQuestionTypes, error: questionTypesError } = await supabase
      .from('question_types')
      .select('id, name, output_type')
      .order('name')

    if (questionTypesError) {
      console.error('Error fetching question types:', questionTypesError)
    }

    // 응답 데이터 구성
    return NextResponse.json({
      passage: {
        ...passage,
        // purpose 필드를 output_type으로 매핑 (타입 호환성)
        unit: passage.unit ? {
          ...passage.unit,
          textbook: passage.unit.textbook ? {
            ...passage.unit.textbook,
            group: passage.unit.textbook.group
          } : null
        } : null
      },
      generatedData: generatedData || [],
      generatedQuestions: (generatedQuestions || []).map(q => ({
        ...q,
        question_type: q.question_type ? {
          ...q.question_type,
          purpose: q.question_type.output_type || 'question' // output_type을 purpose로 매핑
        } : null
      })),
      allDataTypes: allDataTypes || [],
      allQuestionTypes: (allQuestionTypes || []).map(qt => ({
        ...qt,
        purpose: qt.output_type || 'question' // output_type을 purpose로 매핑
      })),
    })

  } catch (error) {
    console.error('Error in GET /api/passages/[id]/generated:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch passage details',
      },
      { status: 500 }
    )
  }
}

