import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - 여러 지문의 생성된 데이터/문제 일괄 삭제
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { passageIds, deleteType, questionTypeId, dataTypeId } = body

    if (!passageIds || !Array.isArray(passageIds) || passageIds.length === 0) {
      return NextResponse.json(
        { error: 'passageIds array is required' },
        { status: 400 }
      )
    }

    // deleteType: 'all' | 'byQuestionType' | 'byDataType'
    if (!deleteType || !['all', 'byQuestionType', 'byDataType'].includes(deleteType)) {
      return NextResponse.json(
        { error: 'deleteType must be "all", "byQuestionType", or "byDataType"' },
        { status: 400 }
      )
    }

    if (deleteType === 'byQuestionType' && !questionTypeId) {
      return NextResponse.json(
        { error: 'questionTypeId is required when deleteType is "byQuestionType"' },
        { status: 400 }
      )
    }

    if (deleteType === 'byDataType' && !dataTypeId) {
      return NextResponse.json(
        { error: 'dataTypeId is required when deleteType is "byDataType"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let deletedQuestions = 0
    let deletedData = 0

    if (deleteType === 'all') {
      // 전체 삭제: 선택된 지문들의 모든 데이터/문제 삭제
      
      // 삭제 전 개수 확인
      const { count: qCount } = await supabase
        .from('generated_questions')
        .select('*', { count: 'exact', head: true })
        .in('passage_id', passageIds)

      const { count: dCount } = await supabase
        .from('generated_data')
        .select('*', { count: 'exact', head: true })
        .in('passage_id', passageIds)

      // 문제 삭제
      const { error: questionError } = await supabase
        .from('generated_questions')
        .delete()
        .in('passage_id', passageIds)

      if (questionError) {
        console.error('Error deleting questions:', questionError)
        return NextResponse.json(
          { error: 'Failed to delete questions' },
          { status: 500 }
        )
      }

      // 데이터 삭제
      const { error: dataError } = await supabase
        .from('generated_data')
        .delete()
        .in('passage_id', passageIds)

      if (dataError) {
        console.error('Error deleting data:', dataError)
        return NextResponse.json(
          { error: 'Failed to delete data' },
          { status: 500 }
        )
      }

      deletedQuestions = qCount || 0
      deletedData = dCount || 0

      return NextResponse.json({
        success: true,
        deleteType: 'all',
        passageCount: passageIds.length,
        deleted: {
          questions: deletedQuestions,
          data: deletedData,
        },
        message: `${passageIds.length}개 지문에서 문제 ${deletedQuestions}개, 데이터 ${deletedData}개가 삭제되었습니다.`
      })

    } else if (deleteType === 'byQuestionType') {
      // 문제 유형별 삭제
      
      // 문제 유형에 연결된 데이터 유형 조회
      const { data: questionTypeItems } = await supabase
        .from('question_type_items')
        .select('data_type_id')
        .eq('question_type_id', questionTypeId)

      const linkedDataTypeIds = questionTypeItems
        ?.map(item => item.data_type_id)
        .filter(Boolean) || []

      // 삭제 전 개수 확인
      const { count: qCount } = await supabase
        .from('generated_questions')
        .select('*', { count: 'exact', head: true })
        .in('passage_id', passageIds)
        .eq('question_type_id', questionTypeId)

      let dCount = 0
      if (linkedDataTypeIds.length > 0) {
        const { count } = await supabase
          .from('generated_data')
          .select('*', { count: 'exact', head: true })
          .in('passage_id', passageIds)
          .in('data_type_id', linkedDataTypeIds)
        dCount = count || 0
      }

      // 문제 삭제
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

      // 종속 데이터 삭제
      if (linkedDataTypeIds.length > 0) {
        const { error: dataError } = await supabase
          .from('generated_data')
          .delete()
          .in('passage_id', passageIds)
          .in('data_type_id', linkedDataTypeIds)

        if (dataError) {
          console.error('Error deleting data:', dataError)
          return NextResponse.json(
            { error: 'Failed to delete linked data' },
            { status: 500 }
          )
        }
      }

      deletedQuestions = qCount || 0
      deletedData = dCount

      // 문제 유형 이름 조회
      const { data: questionType } = await supabase
        .from('question_types')
        .select('name')
        .eq('id', questionTypeId)
        .single()

      return NextResponse.json({
        success: true,
        deleteType: 'byQuestionType',
        questionType: questionType?.name || questionTypeId,
        passageCount: passageIds.length,
        deleted: {
          questions: deletedQuestions,
          data: deletedData,
          linkedDataTypes: linkedDataTypeIds.length,
        },
        message: `${passageIds.length}개 지문에서 "${questionType?.name || '문제 유형'}" 문제 ${deletedQuestions}개, 종속 데이터 ${deletedData}개가 삭제되었습니다.`
      })

    } else {
      // 데이터 유형별 삭제 (byDataType)
      
      // 삭제 전 개수 확인
      const { count: dCount } = await supabase
        .from('generated_data')
        .select('*', { count: 'exact', head: true })
        .in('passage_id', passageIds)
        .eq('data_type_id', dataTypeId)

      // 데이터 삭제
      const { error: dataError } = await supabase
        .from('generated_data')
        .delete()
        .in('passage_id', passageIds)
        .eq('data_type_id', dataTypeId)

      if (dataError) {
        console.error('Error deleting data:', dataError)
        return NextResponse.json(
          { error: 'Failed to delete data' },
          { status: 500 }
        )
      }

      deletedData = dCount || 0

      // 데이터 유형 이름 조회
      const { data: dataType } = await supabase
        .from('data_types')
        .select('name')
        .eq('id', dataTypeId)
        .single()

      return NextResponse.json({
        success: true,
        deleteType: 'byDataType',
        dataType: dataType?.name || dataTypeId,
        passageCount: passageIds.length,
        deleted: {
          data: deletedData,
        },
        message: `${passageIds.length}개 지문에서 "${dataType?.name || '데이터 유형'}" 데이터 ${deletedData}개가 삭제되었습니다.`
      })
    }
  } catch (error) {
    console.error('Error batch deleting:', error)
    return NextResponse.json(
      { error: 'Failed to batch delete' },
      { status: 500 }
    )
  }
}
