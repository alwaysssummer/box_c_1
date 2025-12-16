import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/generated-data/[id]
 * 
 * 특정 생성 데이터 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // 데이터 삭제
    const { error } = await supabase
      .from('generated_data')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting generated_data:', error)
      throw new Error('데이터 삭제에 실패했습니다')
    }

    return NextResponse.json({
      success: true,
      message: '데이터가 삭제되었습니다',
    })

  } catch (error) {
    console.error('Error in DELETE /api/generated-data/[id]:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete data',
        success: false 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/generated-data/[id]
 * 
 * 특정 생성 데이터 조회 (추후 상세보기 기능에서 사용 가능)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    const { data, error } = await supabase
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
        ),
        passage:passages (
          id,
          name,
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
      console.error('Error fetching generated_data:', error)
      throw new Error('데이터를 찾을 수 없습니다')
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in GET /api/generated-data/[id]:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch data',
      },
      { status: 404 }
    )
  }
}

