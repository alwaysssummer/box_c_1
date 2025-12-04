/**
 * 프롬프트 관련 유틸리티 함수
 */

/**
 * 프롬프트 내용에서 변수([[변수명]] 형식)를 추출합니다.
 * @param content - 프롬프트 내용
 * @returns 중복 제거된 변수명 배열
 * @example
 * extractVariables("Hello [[name]], your age is [[age]]")
 * // returns ["name", "age"]
 */
export function extractVariables(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || []
  return [...new Set(matches.map((m) => m.replace(/\[\[|\]\]/g, '')))]
}

