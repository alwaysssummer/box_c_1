import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/generated-questions/delete-by-passage
 * 
 * 특정 지문과 문제 유형에 해당하는 생성된 문제 삭제
 * (재생성 전에 기존 문제를 삭제할 때 사용)
 * 
 * Request Body:
 * {
 *   passageId: string
 *   questionTypeId: string
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { passageId, questionTypeId } = body
    
    if (!passageId || !questionTypeId) {
      return NextResponse.json(
        { error: 'passageId and questionTypeId are required' },
        { status: 400 }
      )
    }
    
    // 해당 지문과 문제 유형으로 생성된 문제 삭제
    const { error } = await supabase
      .from('generated_questions')
      .delete()
      .eq('passage_id', passageId)
      .eq('question_type_id', questionTypeId)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '기존 문제가 삭제되었습니다' 
    })
    
  } catch (error) {
    console.error('Error deleting existing question:', error)
    return NextResponse.json(
      { error: 'Failed to delete existing question' },
      { status: 500 }
    )
  }
}









