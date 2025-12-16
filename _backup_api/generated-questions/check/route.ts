import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/generated-questions/check
 * 
 * 특정 지문들에 대해 특정 문제 유형으로 이미 생성된 문제가 있는지 확인
 * 
 * Request Body:
 * {
 *   passageIds: string[]
 *   questionTypeId: string
 * }
 * 
 * Response:
 * {
 *   existingPassageIds: string[]  // 이미 문제가 생성된 지문 ID 목록
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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
    
    // 해당 지문들에 대해 해당 문제 유형으로 생성된 문제 조회
    const { data, error } = await supabase
      .from('generated_questions')
      .select('passage_id')
      .in('passage_id', passageIds)
      .eq('question_type_id', questionTypeId)
    
    if (error) {
      throw error
    }
    
    // 중복 제거하여 이미 생성된 지문 ID 목록 반환
    const existingPassageIds = [...new Set(data?.map(d => d.passage_id) || [])]
    
    return NextResponse.json({ existingPassageIds })
    
  } catch (error) {
    console.error('Error checking existing questions:', error)
    return NextResponse.json(
      { error: 'Failed to check existing questions' },
      { status: 500 }
    )
  }
}




