/**
 * 프롬프트 결과 파서
 * 
 * AI 응답에서 [[tag]]...[[/tag]] 형식의 데이터를 추출합니다.
 */

// ============================================
// 타입 정의
// ============================================

export interface ParsedQuestionResult {
  instruction: string
  body: string
  choices: string
  answer: string
  explanation: string
  // 분석형
  original: string
  translation: string
  vocabulary: string
  grammar: string
  // 기타
  givenBox: string
  modifiedBody: string
  hints: string
  blanks: string
  underlines: string
  options: string
}

// ============================================
// 파싱 함수
// ============================================

/**
 * [[tag]]...[[/tag]] 형식에서 태그 내용 추출
 */
function extractTag(content: string, tagName: string): string {
  const regex = new RegExp(`\\[\\[${tagName}\\]\\]([\\s\\S]*?)\\[\\[\\/${tagName}\\]\\]`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : ''
}

/**
 * AI 응답 결과를 파싱
 */
export function parsePromptResult(content: string): ParsedQuestionResult {
  return {
    instruction: extractTag(content, 'instruction'),
    body: extractTag(content, 'body'),
    choices: extractTag(content, 'choices'),
    answer: extractTag(content, 'answer'),
    explanation: extractTag(content, 'explanation'),
    original: extractTag(content, 'original'),
    translation: extractTag(content, 'translation'),
    vocabulary: extractTag(content, 'vocabulary'),
    grammar: extractTag(content, 'grammar'),
    givenBox: extractTag(content, 'givenBox') || extractTag(content, 'given'),
    modifiedBody: extractTag(content, 'modifiedBody'),
    hints: extractTag(content, 'hints'),
    blanks: extractTag(content, 'blanks'),
    underlines: extractTag(content, 'underlines'),
    options: extractTag(content, 'options'),
  }
}

/**
 * 선택지 문자열을 배열로 파싱
 */
export function parseChoices(choicesStr: string): string[] {
  if (!choicesStr) return []
  
  // 줄바꿈으로 분리
  const lines = choicesStr.split('\n').filter(line => line.trim())
  
  // 마커 제거
  return lines.map(line => {
    return line
      .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^\([0-9]+\)\s*/, '')
      .replace(/^[A-E][.)]\s*/i, '')
      .trim()
  })
}

/**
 * 정답 파싱 (숫자 또는 마커에서 번호 추출)
 */
export function parseAnswer(answerStr: string): number | string {
  if (!answerStr) return ''
  
  const trimmed = answerStr.trim()
  
  // 숫자인 경우
  const num = parseInt(trimmed, 10)
  if (!isNaN(num) && num >= 1 && num <= 10) {
    return num
  }
  
  // 원문자인 경우
  const circleMarkers = '①②③④⑤⑥⑦⑧⑨⑩'
  const circleIndex = circleMarkers.indexOf(trimmed.charAt(0))
  if (circleIndex >= 0) {
    return circleIndex + 1
  }
  
  return trimmed
}

/**
 * 어휘 목록 파싱
 */
export function parseVocabulary(vocabStr: string): Array<{ word: string; meaning: string }> {
  if (!vocabStr) return []
  
  const lines = vocabStr.split('\n').filter(line => line.trim())
  const result: Array<{ word: string; meaning: string }> = []
  
  for (const line of lines) {
    // "word: meaning" 또는 "word - meaning" 형식
    const match = line.match(/^([^:：\-–]+)[:\-：–]\s*(.+)$/)
    if (match) {
      result.push({
        word: match[1].trim(),
        meaning: match[2].trim(),
      })
    }
  }
  
  return result
}

/**
 * 실전형 문제 데이터 파싱
 */
export function parsePracticalQuestion(content: string): {
  instruction: string
  body: string
  choices: string[]
  answer: number | string
  explanation: string
} {
  const parsed = parsePromptResult(content)
  
  return {
    instruction: parsed.instruction,
    body: parsed.body,
    choices: parseChoices(parsed.choices),
    answer: parseAnswer(parsed.answer),
    explanation: parsed.explanation,
  }
}

/**
 * 분석형 데이터 파싱
 */
export function parseAnalysisData(content: string): {
  original: string
  translation: string
  vocabulary: Array<{ word: string; meaning: string }>
  grammar: string
} {
  const parsed = parsePromptResult(content)
  
  return {
    original: parsed.original,
    translation: parsed.translation,
    vocabulary: parseVocabulary(parsed.vocabulary),
    grammar: parsed.grammar,
  }
}
