import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE - 특정 지문에서 특정 문제 유형의 문제 및 종속 데이터 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: passageId } = await params
    const { searchParams } = new URL(request.url)
    const questionTypeId = searchParams.get('questionTypeId')

    if (!questionTypeId) {
      return NextResponse.json(
        { error: 'questionTypeId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. 문제 유형에 연결된 데이터 유형 ID 조회
    const { data: questionTypeItems, error: itemsError } = await supabase
      .from('question_type_items')
      .select('data_type_id')
      .eq('question_type_id', questionTypeId)

    if (itemsError) {
      console.error('Error fetching question type items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to fetch question type items' },
        { status: 500 }
      )
    }

    const linkedDataTypeIds = questionTypeItems
      ?.map(item => item.data_type_id)
      .filter(Boolean) || []

    // 2. 삭제 전 개수 확인
    const { count: questionCount } = await supabase
      .from('generated_questions')
      .select('*', { count: 'exact', head: true })
      .eq('passage_id', passageId)
      .eq('question_type_id', questionTypeId)

    let dataCount = 0
    if (linkedDataTypeIds.length > 0) {
      const { count } = await supabase
        .from('generated_data')
        .select('*', { count: 'exact', head: true })
        .eq('passage_id', passageId)
        .in('data_type_id', linkedDataTypeIds)
      dataCount = count || 0
    }

    // 3. 해당 문제 유형의 문제 삭제
    const { error: questionError } = await supabase
      .from('generated_questions')
      .delete()
      .eq('passage_id', passageId)
      .eq('question_type_id', questionTypeId)

    if (questionError) {
      console.error('Error deleting questions:', questionError)
      return NextResponse.json(
        { error: 'Failed to delete questions' },
        { status: 500 }
      )
    }

    // 4. 연결된 데이터 유형의 데이터 삭제
    if (linkedDataTypeIds.length > 0) {
      const { error: dataError } = await supabase
        .from('generated_data')
        .delete()
        .eq('passage_id', passageId)
        .in('data_type_id', linkedDataTypeIds)

      if (dataError) {
        console.error('Error deleting linked data:', dataError)
        return NextResponse.json(
          { error: 'Failed to delete linked data' },
          { status: 500 }
        )
      }
    }

    // 문제 유형 이름 조회
    const { data: questionType } = await supabase
      .from('question_types')
      .select('name')
      .eq('id', questionTypeId)
      .single()

    return NextResponse.json({
      success: true,
      questionType: questionType?.name || questionTypeId,
      deleted: {
        questions: questionCount || 0,
        data: dataCount,
        linkedDataTypes: linkedDataTypeIds.length,
      },
      message: `"${questionType?.name || '문제 유형'}" 문제 ${questionCount || 0}개, 종속 데이터 ${dataCount}개가 삭제되었습니다.`
    })
  } catch (error) {
    console.error('Error deleting by question type:', error)
    return NextResponse.json(
      { error: 'Failed to delete by question type' },
      { status: 500 }
    )
  }
}

// POST - 여러 지문에서 특정 문제 유형 일괄 삭제
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { passageIds, questionTypeId } = body

    if (!passageIds || !Array.isArray(passageIds) || passageIds.length === 0) {
      return NextResponse.json(
        { error: 'passageIds array is required' },
        { status: 400 }
      )
    }

    if (!questionTypeId) {
      return NextResponse.json(
        { error: 'questionTypeId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. 문제 유형에 연결된 데이터 유형 ID 조회
    const { data: questionTypeItems } = await supabase
      .from('question_type_items')
      .select('data_type_id')
      .eq('question_type_id', questionTypeId)

    const linkedDataTypeIds = questionTypeItems
      ?.map(item => item.data_type_id)
      .filter(Boolean) || []

    // 2. 삭제 전 개수 확인
    const { count: questionCount } = await supabase
      .from('generated_questions')
      .select('*', { count: 'exact', head: true })
      .in('passage_id', passageIds)
      .eq('question_type_id', questionTypeId)

    let dataCount = 0
    if (linkedDataTypeIds.length > 0) {
      const { count } = await supabase
        .from('generated_data')
        .select('*', { count: 'exact', head: true })
        .in('passage_id', passageIds)
        .in('data_type_id', linkedDataTypeIds)
      dataCount = count || 0
    }

    // 3. 해당 문제 유형의 문제 삭제
    const { error: questionError } = await supabase
      .from('generated_questions')
      .delete()
      .in('passage_id', passageIds)
      .eq('question_type_id', questionTypeId)

    if (questionError) {
      console.error('Error deleting questions:', questionError)
      return NextResponse.json(
        { error: 'Failed to delete questions' },
        { status: 500 }
      )
    }

    // 4. 연결된 데이터 유형의 데이터 삭제
    if (linkedDataTypeIds.length > 0) {
      const { error: dataError } = await supabase
        .from('generated_data')
        .delete()
        .in('passage_id', passageIds)
        .in('data_type_id', linkedDataTypeIds)

      if (dataError) {
        console.error('Error deleting linked data:', dataError)
        return NextResponse.json(
          { error: 'Failed to delete linked data' },
          { status: 500 }
        )
      }
    }

    // 문제 유형 이름 조회
    const { data: questionType } = await supabase
      .from('question_types')
      .select('name')
      .eq('id', questionTypeId)
      .single()

    return NextResponse.json({
      success: true,
      questionType: questionType?.name || questionTypeId,
      passageCount: passageIds.length,
      deleted: {
        questions: questionCount || 0,
        data: dataCount,
      },
      message: `${passageIds.length}개 지문에서 "${questionType?.name || '문제 유형'}" 문제 ${questionCount || 0}개, 종속 데이터 ${dataCount}개가 삭제되었습니다.`
    })
  } catch (error) {
    console.error('Error batch deleting by question type:', error)
    return NextResponse.json(
      { error: 'Failed to batch delete by question type' },
      { status: 500 }
    )
  }
}





