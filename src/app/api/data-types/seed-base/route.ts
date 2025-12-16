import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BASE_DATA_TYPES } from '@/lib/constants/base-data-types'

/**
 * POST /api/data-types/seed-base
 * 기본 데이터 유형을 데이터베이스에 시드합니다.
 */
export async function POST() {
  try {
    const supabase = await createClient()

    const baseDataTypes = Object.values(BASE_DATA_TYPES).map(dt => ({
      id: dt.id,
      name: dt.name,
      target: dt.target,
      prompt_id: null, // AI 호출 없음
      prompt: null,
      output_schema: null,
      sample_result: null,
      has_answer: false,
      answer_format: null,
      has_dependency: false,
      difficulty: 'simple' as const,
      recommended_model: 'none',
      category: 'base' as const,
      config: {
        source: dt.source,
        description: dt.description,
        aggregate: dt.aggregate || false,
        isSystemType: true, // 시스템 제공 타입 표시
      },
    }))

    // upsert로 이미 존재하면 업데이트, 없으면 삽입
    const { data, error } = await (supabase as any)
      .from('data_types')
      .upsert(baseDataTypes, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('기본 데이터 유형 시드 오류:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${baseDataTypes.length}개의 기본 데이터 유형이 등록되었습니다.`,
      data,
    })
  } catch (error) {
    console.error('기본 데이터 유형 시드 오류:', error)
    return NextResponse.json(
      { error: '기본 데이터 유형 시드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/data-types/seed-base
 * 기본 데이터 유형 시드 상태를 확인합니다.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await (supabase as any)
      .from('data_types')
      .select('id, name, category')
      .eq('category', 'base')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const expectedIds = Object.values(BASE_DATA_TYPES).map(dt => dt.id)
    const existingIds = data?.map((d: any) => d.id) || []
    const missingIds = expectedIds.filter(id => !existingIds.includes(id))

    return NextResponse.json({
      seeded: missingIds.length === 0,
      total: expectedIds.length,
      existing: existingIds.length,
      missing: missingIds,
      data,
    })
  } catch (error) {
    console.error('기본 데이터 유형 확인 오류:', error)
    return NextResponse.json(
      { error: '기본 데이터 유형 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}






























