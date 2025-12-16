import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/passages/batch-delete-generated
 * 
 * 선택된 여러 지문의 생성 데이터/문제를 일괄 삭제
 * 
 * Body:
 * - passageIds: string[] - 삭제할 지문 ID 목록
 * - deleteType: 'all' | 'byDataType' | 'byQuestionType'
 * - dataTypeId?: string - deleteType이 'byDataType'일 때 필수
 * - questionTypeId?: string - deleteType이 'byQuestionType'일 때 필수
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { 
      passageIds, 
      deleteType,
      dataTypeId,
      questionTypeId 
    } = body as {
      passageIds: string[]
      deleteType: 'all' | 'byDataType' | 'byQuestionType'
      dataTypeId?: string
      questionTypeId?: string
    }

    if (!passageIds || !Array.isArray(passageIds) || passageIds.length === 0) {
      return NextResponse.json(
        { error: 'passageIds는 필수이며 배열이어야 합니다' },
        { status: 400 }
      )
    }

    if (!deleteType) {
      return NextResponse.json(
        { error: 'deleteType은 필수입니다' },
        { status: 400 }
      )
    }

    let deletedDataCount = 0
    let deletedQuestionCount = 0

    // 1. 전체 삭제
    if (deleteType === 'all') {
      // 생성된 데이터 삭제
      const { error: dataError, count: dataCount } = await supabase
        .from('generated_data')
        .delete()
        .in('passage_id', passageIds)
        .select('id', { count: 'exact', head: true })

      if (dataError) {
        console.error('Error deleting generated_data:', dataError)
        throw new Error('데이터 삭제에 실패했습니다')
      }
      deletedDataCount = dataCount || 0

      // 생성된 문제 삭제
      const { error: questionError, count: questionCount } = await supabase
        .from('generated_questions')
        .delete()
        .in('passage_id', passageIds)
        .select('id', { count: 'exact', head: true })

      if (questionError) {
        console.error('Error deleting generated_questions:', questionError)
        throw new Error('문제 삭제에 실패했습니다')
      }
      deletedQuestionCount = questionCount || 0

      return NextResponse.json({
        success: true,
        message: `${passageIds.length}개 지문의 데이터 ${deletedDataCount}개, 문제 ${deletedQuestionCount}개를 삭제했습니다`,
        deletedDataCount,
        deletedQuestionCount,
      })
    }

    // 2. 특정 데이터 유형만 삭제
    if (deleteType === 'byDataType') {
      if (!dataTypeId) {
        return NextResponse.json(
          { error: 'dataTypeId는 필수입니다' },
          { status: 400 }
        )
      }

      const { error: dataError, count: dataCount } = await supabase
        .from('generated_data')
        .delete()
        .in('passage_id', passageIds)
        .eq('data_type_id', dataTypeId)
        .select('id', { count: 'exact', head: true })

      if (dataError) {
        console.error('Error deleting generated_data by type:', dataError)
        throw new Error('데이터 삭제에 실패했습니다')
      }
      deletedDataCount = dataCount || 0

      return NextResponse.json({
        success: true,
        message: `${passageIds.length}개 지문에서 해당 데이터 유형 ${deletedDataCount}개를 삭제했습니다`,
        deletedDataCount,
        deletedQuestionCount: 0,
      })
    }

    // 3. 특정 문제 유형만 삭제 (+ 종속 데이터 처리)
    if (deleteType === 'byQuestionType') {
      if (!questionTypeId) {
        return NextResponse.json(
          { error: 'questionTypeId는 필수입니다' },
          { status: 400 }
        )
      }

      // 문제 삭제
      const { error: questionError, count: questionCount } = await supabase
        .from('generated_questions')
        .delete()
        .in('passage_id', passageIds)
        .eq('question_type_id', questionTypeId)
        .select('id', { count: 'exact', head: true })

      if (questionError) {
        console.error('Error deleting generated_questions by type:', questionError)
        throw new Error('문제 삭제에 실패했습니다')
      }
      deletedQuestionCount = questionCount || 0

      // TODO: 종속 데이터 삭제 로직 (필요 시)
      // 문제 유형이 특정 데이터에 의존하는 경우, 해당 데이터도 삭제할지 결정
      // 현재는 문제만 삭제하고 데이터는 유지

      return NextResponse.json({
        success: true,
        message: `${passageIds.length}개 지문에서 해당 문제 유형 ${deletedQuestionCount}개를 삭제했습니다`,
        deletedDataCount: 0,
        deletedQuestionCount,
      })
    }

    return NextResponse.json(
      { error: '알 수 없는 deleteType입니다' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error in batch delete:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete generated content',
        success: false 
      },
      { status: 500 }
    )
  }
}

