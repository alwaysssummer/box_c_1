/**
 * 출제 2단계 시스템 - 프롬프트 파싱 시스템
 * 
 * 프롬프트 결과에서 [[tag]]...[[/tag]] 형식의 구분인자를 파싱하여
 * 슬롯명별 데이터 객체로 변환
 */

import { SlotName, STANDARD_SLOTS } from './slot-system'

// ============================================
// 타입 정의
// ============================================

/**
 * 파싱된 슬롯 데이터
 */
export interface ParsedSlotData {
  [slotName: string]: string | string[] | number | boolean | null
}

/**
 * 파싱 결과
 */
export interface ParseResult {
  success: boolean
  data: ParsedSlotData
  warnings: string[]
  errors: string[]
  rawTags: string[]  // 파싱된 태그명 목록
}

/**
 * 파싱 옵션
 */
export interface ParseOptions {
  /**
   * 알 수 없는 태그 허용 여부
   * true: 표준 슬롯명이 아니어도 파싱
   * false: 표준 슬롯명만 파싱 (기본값)
   */
  allowUnknownTags?: boolean
  
  /**
   * 빈 값 허용 여부
   * true: 빈 태그도 포함
   * false: 빈 태그는 제외 (기본값)
   */
  allowEmptyValues?: boolean
  
  /**
   * 배열로 파싱할 태그 목록
   * 해당 태그는 줄바꿈으로 분리하여 배열로 변환
   */
  arrayTags?: string[]
  
  /**
   * JSON으로 파싱할 태그 목록
   * 해당 태그 내용을 JSON.parse 시도
   */
  jsonTags?: string[]
}

// ============================================
// 메인 파싱 함수
// ============================================

/**
 * 프롬프트 결과 파싱
 * 
 * @param result - 프롬프트 실행 결과 문자열
 * @param options - 파싱 옵션
 * @returns 파싱 결과
 * 
 * @example
 * ```typescript
 * const result = `
 * [[original]]The concept of social capital...[[/original]]
 * [[translation]]사회적 자본의 개념은...[[/translation]]
 * [[vocabulary]]
 * social: 사회적인
 * capital: 자본
 * [[/vocabulary]]
 * `
 * 
 * const parsed = parsePromptResult(result, { arrayTags: ['vocabulary'] })
 * // {
 * //   success: true,
 * //   data: {
 * //     original: 'The concept of social capital...',
 * //     translation: '사회적 자본의 개념은...',
 * //     vocabulary: ['social: 사회적인', 'capital: 자본']
 * //   },
 * //   ...
 * // }
 * ```
 */
export function parsePromptResult(
  result: string,
  options: ParseOptions = {}
): ParseResult {
  const {
    allowUnknownTags = false,
    allowEmptyValues = false,
    arrayTags = [],
    jsonTags = [],
  } = options
  
  const data: ParsedSlotData = {}
  const warnings: string[] = []
  const errors: string[] = []
  const rawTags: string[] = []
  
  // 태그 패턴: [[tagName]]content[[/tagName]]
  const tagPattern = /\[\[(\w+)\]\]([\s\S]*?)\[\[\/\1\]\]/g
  
  let match: RegExpExecArray | null
  let matchCount = 0
  
  while ((match = tagPattern.exec(result)) !== null) {
    matchCount++
    const tagName = match[1]
    let content = match[2].trim()
    
    rawTags.push(tagName)
    
    // 표준 슬롯명 검증
    const isStandardSlot = tagName in STANDARD_SLOTS
    if (!isStandardSlot && !allowUnknownTags) {
      warnings.push(`알 수 없는 태그: [[${tagName}]] (표준 슬롯명이 아님)`)
      continue
    }
    
    // 빈 값 처리
    if (!content && !allowEmptyValues) {
      warnings.push(`빈 태그 무시: [[${tagName}]]`)
      continue
    }
    
    // 배열 변환
    if (arrayTags.includes(tagName)) {
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      data[tagName] = lines
      continue
    }
    
    // JSON 파싱
    if (jsonTags.includes(tagName)) {
      try {
        data[tagName] = JSON.parse(content)
      } catch {
        errors.push(`JSON 파싱 실패: [[${tagName}]] - ${content.substring(0, 50)}...`)
        data[tagName] = content
      }
      continue
    }
    
    // 기본: 문자열로 저장
    data[tagName] = content
  }
  
  // 매칭 없는 경우 경고
  if (matchCount === 0) {
    warnings.push('파싱된 태그가 없습니다. 결과 형식을 확인해주세요.')
  }
  
  return {
    success: errors.length === 0,
    data,
    warnings,
    errors,
    rawTags,
  }
}

// ============================================
// 특수 포맷 파싱 함수
// ============================================

/**
 * 선택지 파싱 (번호 형식)
 * 
 * @example
 * ```
 * ① 첫 번째 선택지
 * ② 두 번째 선택지
 * ③ 세 번째 선택지
 * ```
 */
export function parseChoices(content: string): string[] {
  const choices: string[] = []
  
  // 다양한 마커 패턴 지원
  const patterns = [
    /[①②③④⑤⑥⑦⑧⑨⑩]\s*(.+)/g,  // ① ② ③
    /\((\d+)\)\s*(.+)/g,           // (1) (2) (3)
    /(\d+)\.\s*(.+)/g,             // 1. 2. 3.
    /[A-E]\.\s*(.+)/gi,            // A. B. C.
  ]
  
  // 각 패턴으로 시도
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const choiceText = match[match.length - 1].trim()
      if (choiceText) {
        choices.push(choiceText)
      }
    }
    if (choices.length > 0) break
  }
  
  // 패턴 매칭 실패 시 줄바꿈으로 분리
  if (choices.length === 0) {
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
  }
  
  return choices
}

/**
 * 정답 파싱 (숫자/문자 추출)
 */
export function parseAnswer(content: string): number | string {
  const trimmed = content.trim()
  
  // 숫자만 있는 경우
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10)
  }
  
  // 원문자 (①②③④⑤)
  const circleNumbers = '①②③④⑤⑥⑦⑧⑨⑩'
  const circleIndex = circleNumbers.indexOf(trimmed)
  if (circleIndex !== -1) {
    return circleIndex + 1
  }
  
  // 기타는 문자열로 반환
  return trimmed
}

/**
 * 어휘 목록 파싱
 * 
 * @example
 * ```
 * social: 사회적인
 * capital: 자본, 수도
 * concept: 개념
 * ```
 */
export function parseVocabulary(content: string): Array<{ word: string; meaning: string }> {
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
  
  return lines.map(line => {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) {
      return { word: line, meaning: '' }
    }
    return {
      word: line.substring(0, colonIndex).trim(),
      meaning: line.substring(colonIndex + 1).trim(),
    }
  })
}

// ============================================
// 실전형 문제 전용 파싱
// ============================================

/**
 * 실전형 문제 파싱 옵션
 */
export const PRACTICAL_PARSE_OPTIONS: ParseOptions = {
  allowUnknownTags: false,
  allowEmptyValues: false,
  arrayTags: [],  // choices는 별도 처리
  jsonTags: [],
}

/**
 * 실전형 문제 전용 파싱
 * instruction, body, choices, answer, explanation 추출
 */
export function parsePracticalQuestion(result: string): ParseResult & {
  formattedData?: {
    instruction: string
    body: string
    choices: string[]
    answer: number | string
    explanation?: string
  }
} {
  const parsed = parsePromptResult(result, PRACTICAL_PARSE_OPTIONS)
  
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return parsed
  }
  
  const formattedData = {
    instruction: (parsed.data.instruction as string) || '',
    body: (parsed.data.body as string) || '',
    choices: parsed.data.choices 
      ? parseChoices(parsed.data.choices as string)
      : [],
    answer: parsed.data.answer 
      ? parseAnswer(parsed.data.answer as string)
      : '',
    explanation: parsed.data.explanation as string | undefined,
  }
  
  return {
    ...parsed,
    formattedData,
  }
}

// ============================================
// 분석형 데이터 전용 파싱
// ============================================

/**
 * 분석형 데이터 파싱 옵션
 */
export const ANALYSIS_PARSE_OPTIONS: ParseOptions = {
  allowUnknownTags: false,
  allowEmptyValues: false,
  arrayTags: ['vocabulary'],
  jsonTags: [],
}

/**
 * 분석형 데이터 전용 파싱
 * original, translation, vocabulary, grammar 추출
 */
export function parseAnalysisData(result: string): ParseResult & {
  formattedData?: {
    original: string
    translation: string
    vocabulary?: Array<{ word: string; meaning: string }>
    grammar?: string
  }
} {
  const parsed = parsePromptResult(result, ANALYSIS_PARSE_OPTIONS)
  
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return parsed
  }
  
  const vocabData = parsed.data.vocabulary
  let vocabulary: Array<{ word: string; meaning: string }> | undefined
  
  if (Array.isArray(vocabData)) {
    vocabulary = vocabData.map(item => {
      if (typeof item === 'string') {
        const [word, meaning] = item.split(':').map(s => s.trim())
        return { word: word || item, meaning: meaning || '' }
      }
      return { word: String(item), meaning: '' }
    })
  } else if (typeof vocabData === 'string') {
    vocabulary = parseVocabulary(vocabData)
  }
  
  const formattedData = {
    original: (parsed.data.original as string) || '',
    translation: (parsed.data.translation as string) || '',
    vocabulary,
    grammar: parsed.data.grammar as string | undefined,
  }
  
  return {
    ...parsed,
    formattedData,
  }
}

// ============================================
// 프롬프트 템플릿 생성 헬퍼
// ============================================

/**
 * 슬롯 기반 프롬프트 출력 템플릿 생성
 * 
 * @param slots - 출력할 슬롯 목록
 * @returns 프롬프트에 포함할 출력 형식 안내 문자열
 */
export function generateOutputTemplate(slots: SlotName[]): string {
  const lines = slots.map(slot => {
    const label = STANDARD_SLOTS[slot]
    return `[[${slot}]]${label} 내용[[/${slot}]]`
  })
  
  return `
반드시 아래 형식으로 출력해주세요:

${lines.join('\n')}
`.trim()
}

/**
 * 슬롯 태그 검증
 * 프롬프트 결과에 필요한 모든 슬롯이 포함되어 있는지 확인
 */
export function validateRequiredSlots(
  parsedData: ParsedSlotData,
  requiredSlots: SlotName[]
): { valid: boolean; missing: SlotName[] } {
  const missing = requiredSlots.filter(slot => !parsedData[slot])
  return {
    valid: missing.length === 0,
    missing,
  }
}



