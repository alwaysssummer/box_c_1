import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/generated-questions/cleanup
 * 
 * 잘못 생성된 문제들을 삭제합니다.
 * - 더미 본문("The rise of social media")을 가진 문제들
 * - 본문이 실제 지문과 일치하지 않는 문제들
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { dryRun = true } = body // 기본값: 실제 삭제하지 않고 확인만
    
    // 더미 본문 패턴
    const dummyPatterns = [
      'The rise of social media',
      'social media has profoundly impacted',
    ]
    
    // 모든 generated_questions 조회
    const { data: allQuestions, error: fetchError } = await supabase
      .from('generated_questions')
      .select('id, body, passage_id, question_type_id, created_at')
    
    if (fetchError) {
      throw fetchError
    }
    
    // 더미 본문을 가진 문제 찾기
    const badQuestions = (allQuestions || []).filter(q => {
      if (!q.body) return false
      return dummyPatterns.some(pattern => q.body.includes(pattern))
    })
    
    console.log(`전체 문제 수: ${allQuestions?.length || 0}`)
    console.log(`삭제 대상 문제 수: ${badQuestions.length}`)
    
    if (dryRun) {
      // 확인만
      return NextResponse.json({
        dryRun: true,
        totalQuestions: allQuestions?.length || 0,
        badQuestionsCount: badQuestions.length,
        badQuestions: badQuestions.map(q => ({
          id: q.id,
          bodyPreview: q.body?.substring(0, 100) + '...',
          passage_id: q.passage_id,
          created_at: q.created_at,
        })),
        message: '실제 삭제하려면 dryRun: false로 요청하세요.'
      })
    }
    
    // 실제 삭제
    const idsToDelete = badQuestions.map(q => q.id)
    
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('generated_questions')
        .delete()
        .in('id', idsToDelete)
      
      if (deleteError) {
        throw deleteError
      }
    }
    
    return NextResponse.json({
      success: true,
      deletedCount: idsToDelete.length,
      deletedIds: idsToDelete,
      message: `${idsToDelete.length}개의 잘못된 문제가 삭제되었습니다.`
    })
    
  } catch (error) {
    console.error('Error cleaning up questions:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup questions' },
      { status: 500 }
    )
  }
}









