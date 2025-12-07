import { NextRequest, NextResponse } from 'next/server'

/**
 * 누락된 데이터 생성 API
 * 아직 구현되지 않음
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Not implemented yet' },
    { status: 501 }
  )
}
