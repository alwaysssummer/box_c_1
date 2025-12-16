/**
 * 시스템 설정 API
 * 
 * GET: 시스템 설정 조회
 * PUT: 시스템 설정 업데이트
 * 
 * 참고: DB 테이블이 없어도 기본값을 반환합니다.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 기본값
const DEFAULT_TEMPLATE_SETTINGS = {
  fontSize: 9,
  lineHeight: 1.6,
  padding: { top: 15, bottom: 15, left: 15, right: 15 },
  columnGap: 24,
  questionSpacing: 16,
  choiceMarker: 'circle',
  breakMode: 'protect-passage',
}

// Supabase 클라이언트 생성
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 시스템 설정 조회
export async function GET(request: Request) {
  try {
    const supabase = getSupabase()
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key === 'template_defaults') {
      try {
        // DB에서 조회 시도
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('key', key)
          .single()

        if (error) {
          // 테이블이 없거나 레코드가 없으면 기본값 반환
          console.log('시스템 설정 테이블/레코드 없음, 기본값 반환')
          return NextResponse.json({
            key: 'template_defaults',
            value: DEFAULT_TEMPLATE_SETTINGS,
            description: '출력 템플릿 시스템 기본값 (기본값)'
          })
        }

        return NextResponse.json(data)
      } catch {
        // DB 오류 시 기본값 반환
        return NextResponse.json({
          key: 'template_defaults',
          value: DEFAULT_TEMPLATE_SETTINGS,
          description: '출력 템플릿 시스템 기본값 (기본값)'
        })
      }
    }

    // 전체 조회
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key')

      if (error) {
        // 테이블이 없으면 빈 배열 반환
        return NextResponse.json([])
      }

      return NextResponse.json(data)
    } catch {
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('시스템 설정 조회 오류:', error)
    // 오류 시에도 기본값 반환
    return NextResponse.json({
      key: 'template_defaults',
      value: DEFAULT_TEMPLATE_SETTINGS,
      description: '출력 템플릿 시스템 기본값 (오류 발생, 기본값 반환)'
    })
  }
}

// 시스템 설정 업데이트
export async function PUT(request: Request) {
  try {
    const supabase = getSupabase()
    const body = await request.json()
    const { key, value, description } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'key와 value는 필수입니다.' },
        { status: 400 }
      )
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          description,
        })
        .select()
        .single()

      if (error) {
        // 테이블이 없으면 메모리에만 저장 (실제로는 저장되지 않음)
        console.error('시스템 설정 테이블 없음:', error)
        return NextResponse.json({
          key,
          value,
          description,
          warning: '테이블이 없어 저장되지 않았습니다. 마이그레이션을 실행하세요.'
        })
      }

      return NextResponse.json(data)
    } catch (err) {
      console.error('시스템 설정 저장 오류:', err)
      return NextResponse.json({
        key,
        value,
        description,
        warning: '저장 중 오류가 발생했습니다.'
      })
    }
  } catch (error) {
    console.error('시스템 설정 업데이트 오류:', error)
    return NextResponse.json(
      { error: '시스템 설정을 저장하는 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
