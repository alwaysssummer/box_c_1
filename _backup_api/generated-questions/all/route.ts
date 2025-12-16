import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/generated-questions/all
 * 
 * 모든 generated_questions를 조회합니다.
 * 중복 정리 스크립트 등에서 사용됩니다.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: questions, error } = await supabase
      .from('generated_questions')
      .select('id, passage_id, question_type_id, created_at')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({
      questions: questions || [],
      count: questions?.length || 0,
    })
  } catch (error) {
    console.error('Error fetching all generated questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generated questions' },
      { status: 500 }
    )
  }
}








