/**
 * API 관련 유틸리티 함수
 */

import { NextResponse } from 'next/server'

/**
 * API 에러를 일관된 형식으로 처리합니다.
 * @param error - 발생한 에러
 * @param message - 사용자에게 표시할 에러 메시지
 * @param status - HTTP 상태 코드 (기본: 500)
 * @returns NextResponse JSON 응답
 */
export function handleApiError(
  error: unknown,
  message: string,
  status: number = 500
): NextResponse {
  console.error(`${message}:`, error)
  return NextResponse.json({ error: message }, { status })
}

/**
 * API 성공 응답을 생성합니다.
 * @param data - 응답 데이터
 * @param status - HTTP 상태 코드 (기본: 200)
 * @returns NextResponse JSON 응답
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * 404 Not Found 응답을 생성합니다.
 * @param resource - 리소스 이름 (예: "Prompt", "DataType")
 * @returns NextResponse JSON 응답
 */
export function apiNotFound(resource: string): NextResponse {
  return NextResponse.json(
    { error: `${resource} not found` },
    { status: 404 }
  )
}

































