/**
 * 문장 분리 유틸리티
 * - Regex 기반 1차 분리
 * - 따옴표/괄호 안의 마침표 보호
 * - 휴리스틱 품질 체크
 * - 번역 검증
 */

import { ParsedSentence, SentenceSplitResult, TranslationStatus } from '@/types'

// 약어 목록 (문장 끝으로 오해하기 쉬운 것들)
const ABBREVIATIONS = [
  // 호칭
  'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Jr.', 'Sr.',
  // 국가/지역
  'U.S.', 'U.K.', 'U.N.', 'E.U.',
  // 학위
  'Ph.D.', 'M.D.', 'B.A.', 'M.A.', 'B.S.', 'M.S.',
  // 라틴어 약어
  'e.g.', 'i.e.', 'etc.', 'vs.', 'cf.',
  // 월
  'Jan.', 'Feb.', 'Mar.', 'Apr.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
  // 요일
  'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.',
  // 기타
  'St.', 'Ave.', 'Blvd.', 'Rd.', 'Mt.', 'Inc.', 'Corp.', 'Ltd.', 'Co.',
  'a.m.', 'p.m.', 'A.M.', 'P.M.',
  'No.', 'Vol.', 'pp.', 'Fig.', 'Eq.',
]

/**
 * 따옴표 안의 문장부호를 임시 마커로 대체 (문장 끝 제외)
 * "wrong." 처럼 따옴표로 끝나는 경우는 문장 끝으로 인식해야 함
 */
function protectQuotedContent(text: string): string {
  // 큰따옴표 안의 내용에서 마침표만 보호
  // 단, "wrong." 패턴은 따옴표 닫힘 직전의 마침표이므로 보호하지 않음
  let result = text.replace(/"([^"]+)"/g, (match, content) => {
    // 마지막 문자가 마침표인 경우 (예: "wrong.") → 마지막 마침표는 보호 안 함
    if (content.endsWith('.')) {
      const beforeDot = content.slice(0, -1)
        .replace(/\./g, '__QDOT__')
        .replace(/!/g, '__QEXCL__')
        .replace(/\?/g, '__QQUES__')
      return `"${beforeDot}."`
    }
    const protectedContent = content
      .replace(/\./g, '__QDOT__')
      .replace(/!/g, '__QEXCL__')
      .replace(/\?/g, '__QQUES__')
    return `"${protectedContent}"`
  })
  
  // 작은따옴표로 감싸진 단어 보호 (예: 'wrong')
  result = result.replace(/'([^']{2,})'/g, (match, content) => {
    // 단일 문자는 어포스트로피일 수 있으므로 2자 이상만 처리
    if (content.endsWith('.')) {
      const beforeDot = content.slice(0, -1)
        .replace(/\./g, '__SDOT__')
      return `'${beforeDot}.'`
    }
    const protectedContent = content.replace(/\./g, '__SDOT__')
    return `'${protectedContent}'`
  })
  
  // 괄호 안의 마침표 보호
  result = result.replace(/\(([^)]+)\)/g, (match, content) => {
    const protectedContent = content
      .replace(/\./g, '__PDOT__')
      .replace(/!/g, '__PEXCL__')
      .replace(/\?/g, '__PQUES__')
    return `(${protectedContent})`
  })
  
  return result
}

/**
 * 마커를 원본으로 복원
 */
function restoreQuotedMarkers(text: string): string {
  return text
    .replace(/__QDOT__/g, '.')
    .replace(/__QEXCL__/g, '!')
    .replace(/__QQUES__/g, '?')
    .replace(/__SDOT__/g, '.')
    .replace(/__SEXCL__/g, '!')
    .replace(/__SQUES__/g, '?')
    .replace(/__PDOT__/g, '.')
    .replace(/__PEXCL__/g, '!')
    .replace(/__PQUES__/g, '?')
}

/**
 * Regex 기반 문장 분리 (개선 버전)
 */
export function splitSentencesByRegex(text: string): ParsedSentence[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // 텍스트 정규화
  let normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // 1. 따옴표/괄호 안의 내용 보호
  normalizedText = protectQuotedContent(normalizedText)

  // 2. 약어 보호: 약어의 마침표를 임시 마커로 대체
  const abbrMarkers: { marker: string; original: string }[] = []
  ABBREVIATIONS.forEach((abbr, idx) => {
    const marker = `__ABBR_${idx}__`
    // 약어가 단어 경계에서 시작하도록 \b 추가
    const escapedAbbr = abbr.replace(/\./g, '\\.')
    const regex = new RegExp(`\\b${escapedAbbr}`, 'gi')
    if (regex.test(normalizedText)) {
      abbrMarkers.push({ marker, original: abbr })
      normalizedText = normalizedText.replace(regex, marker)
    }
  })

  // 3. 숫자 + 마침표 패턴 보호 (예: "1.", "2.5")
  normalizedText = normalizedText.replace(/(\d)\.(\d)/g, '$1__DECIMAL__$2')
  normalizedText = normalizedText.replace(/(\d)\.\s*(?=[A-Z])/g, '$1__ENUM__ ')

  // 4. 문장 분리 - 개선된 패턴
  // 마침표/느낌표/물음표 뒤에 공백이 오고, 대문자나 따옴표가 오는 경우 분리
  // "wrong." 처럼 마침표 뒤에 따옴표가 오는 경우도 처리
  // 약어로 시작하는 문장도 인식 (Dr., Mr. 등)
  const sentences: string[] = []
  
  // 더 정교한 분리: 문장 종결 패턴 찾기
  // 패턴: [.!?] + 선택적 따옴표 + 공백 + (대문자 or 따옴표 or 숫자 or 약어마커 or 끝)
  const sentenceEndPattern = /([.!?]["']?)(\s+)(?=[A-Z"'\d]|__ABBR_|$)/g
  
  let lastIndex = 0
  let match
  
  // 먼저 모든 분리 지점 찾기
  const splitPoints: number[] = []
  while ((match = sentenceEndPattern.exec(normalizedText)) !== null) {
    // 분리 지점 = 마침표 위치 + 마침표 길이
    splitPoints.push(match.index + match[1].length)
  }
  
  // 분리 지점이 없으면 전체를 하나의 문장으로
  if (splitPoints.length === 0) {
    sentences.push(normalizedText.trim())
  } else {
    // 분리 지점으로 문장 나누기
    for (let i = 0; i < splitPoints.length; i++) {
      const start = i === 0 ? 0 : splitPoints[i - 1]
      const end = splitPoints[i]
      const sentence = normalizedText.slice(start, end).trim()
      if (sentence.length > 0) {
        sentences.push(sentence)
      }
    }
    // 마지막 문장
    const lastSentence = normalizedText.slice(splitPoints[splitPoints.length - 1]).trim()
    if (lastSentence.length > 0) {
      sentences.push(lastSentence)
    }
  }

  // 5. 마커 복원 및 결과 생성
  const result: ParsedSentence[] = sentences.map((sentence, idx) => {
    let restored = sentence

    // 약어 복원
    abbrMarkers.forEach(({ marker, original }) => {
      restored = restored.replace(new RegExp(marker, 'g'), original)
    })

    // 숫자 복원
    restored = restored.replace(/__DECIMAL__/g, '.')
    restored = restored.replace(/__ENUM__/g, '.')

    // 따옴표/괄호 복원
    restored = restoreQuotedMarkers(restored)

    const wordCount = countWords(restored)
    const confidence = calculateSentenceConfidence(restored)

    return {
      no: idx + 1,
      content: restored.trim(),
      wordCount,
      confidence,
      issues: detectIssues(restored),
    }
  })

  // 빈 문장 필터링 및 번호 재정렬
  return result
    .filter(s => s.content.length > 0)
    .map((s, idx) => ({ ...s, no: idx + 1 }))
}

/**
 * 단어 수 계산
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length
}

/**
 * 문장 신뢰도 계산
 */
function calculateSentenceConfidence(sentence: string): number {
  let confidence = 1.0

  // 문장 길이 체크
  const wordCount = countWords(sentence)
  if (wordCount < 3) confidence -= 0.1
  if (wordCount > 50) confidence -= 0.1

  // 약어 포함 여부
  if (ABBREVIATIONS.some(abbr => sentence.includes(abbr))) {
    confidence -= 0.05
  }

  // 괄호/따옴표 불균형
  const openParens = (sentence.match(/\(/g) || []).length
  const closeParens = (sentence.match(/\)/g) || []).length
  if (openParens !== closeParens) confidence -= 0.15

  const doubleQuotes = (sentence.match(/"/g) || []).length
  if (doubleQuotes % 2 !== 0) confidence -= 0.1
  
  const singleQuotes = (sentence.match(/'/g) || []).length
  // 작은따옴표는 어포스트로피로도 쓰이므로 덜 엄격하게
  if (singleQuotes % 2 !== 0 && singleQuotes > 2) confidence -= 0.05

  // 숫자로 시작 (목록 항목일 수 있음)
  if (/^\d+\./.test(sentence)) confidence -= 0.1

  // 문장 부호 없이 끝남
  if (!/[.!?]$/.test(sentence) && !/[.!?]["']$/.test(sentence)) confidence -= 0.2

  return Math.max(0, Math.min(1, confidence))
}

/**
 * 문제점 감지
 */
function detectIssues(sentence: string): string[] {
  const issues: string[] = []

  // 약어 감지
  const foundAbbrs = ABBREVIATIONS.filter(abbr => {
    const regex = new RegExp(`\\b${abbr.replace(/\./g, '\\.')}`, 'i')
    return regex.test(sentence)
  })
  if (foundAbbrs.length > 0) {
    issues.push(`약어 감지: ${foundAbbrs.join(', ')}`)
  }

  // 너무 짧음
  if (countWords(sentence) < 3) {
    issues.push('문장이 너무 짧음')
  }

  // 너무 김
  if (countWords(sentence) > 50) {
    issues.push('문장이 너무 김 (분리 필요할 수 있음)')
  }

  // 괄호 불균형
  const openParens = (sentence.match(/\(/g) || []).length
  const closeParens = (sentence.match(/\)/g) || []).length
  if (openParens !== closeParens) {
    issues.push('괄호 불균형')
  }

  // 따옴표 불균형
  const doubleQuotes = (sentence.match(/"/g) || []).length
  if (doubleQuotes % 2 !== 0) {
    issues.push('큰따옴표 불균형')
  }

  return issues
}

/**
 * 전체 분리 결과의 신뢰도 계산
 */
export function calculateOverallConfidence(sentences: ParsedSentence[]): number {
  if (sentences.length === 0) return 0
  
  const sum = sentences.reduce((acc, s) => acc + s.confidence, 0)
  const avg = sum / sentences.length

  // 이슈가 있는 문장 비율
  const issueCount = sentences.filter(s => (s.issues?.length || 0) > 0).length
  const issuePenalty = (issueCount / sentences.length) * 0.1

  return Math.max(0, avg - issuePenalty)
}

/**
 * 한글 번역 상태 분석
 */
export function analyzeTranslation(
  englishText: string,
  koreanText: string | null
): TranslationStatus {
  const signals: string[] = []
  let suspicionLevel = 0

  // 번역 누락 체크
  if (!koreanText || koreanText.trim().length === 0) {
    return {
      hasTranslation: false,
      sentenceCount: { english: splitSentencesByRegex(englishText).length, korean: 0 },
      alignment: 'missing',
      quality: 'unknown',
      needsAI: true,
      suspicionLevel: 100,
      signals: ['번역 없음'],
    }
  }

  const enSentences = splitSentencesByRegex(englishText)
  const krSentences = splitKoreanSentences(koreanText)

  // 문장 개수 비교
  if (enSentences.length !== krSentences.length) {
    signals.push(`문장 개수 불일치 (영: ${enSentences.length}, 한: ${krSentences.length})`)
    suspicionLevel += 40
  }

  // 길이 비율 체크
  const lengthRatio = koreanText.length / englishText.length
  if (lengthRatio < 0.3) {
    signals.push('번역이 너무 짧음')
    suspicionLevel += 30
  }
  if (lengthRatio > 3.0) {
    signals.push('번역이 너무 김')
    suspicionLevel += 20
  }

  // 영어 단어 비율 (번역 안 된 부분)
  const englishWords = koreanText.match(/[a-zA-Z]{3,}/g) || []
  const totalWords = koreanText.split(/\s+/).length
  const englishRatio = totalWords > 0 ? englishWords.length / totalWords : 0
  if (englishRatio > 0.3) {
    signals.push('번역 안 된 영어 단어 많음')
    suspicionLevel += 25
  }

  // 한글 비율 체크
  const koreanChars = koreanText.match(/[가-힣]/g) || []
  if (koreanChars.length < 10) {
    signals.push('한글이 거의 없음')
    suspicionLevel += 35
  }

  // 반복 패턴 (복붙 오류)
  if (/(.{10,})\1+/.test(koreanText)) {
    signals.push('반복된 텍스트 발견')
    suspicionLevel += 40
  }

  // 결과 결정
  const alignment = enSentences.length === krSentences.length ? 'perfect' : 'mismatch'
  const quality = suspicionLevel < 20 ? 'good' : suspicionLevel < 50 ? 'suspicious' : 'unknown'
  const needsAI = suspicionLevel >= 50 || alignment === 'mismatch'

  return {
    hasTranslation: true,
    sentenceCount: { english: enSentences.length, korean: krSentences.length },
    alignment,
    quality,
    needsAI,
    suspicionLevel,
    signals,
  }
}

/**
 * 한글 문장 분리
 */
export function splitKoreanSentences(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  // 한국어 문장 종결 패턴
  const sentences = text
    .split(/(?<=[.!?다요죠음함])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return sentences
}

/**
 * 영어-한글 문장 매칭 시도
 */
export function matchSentences(
  englishSentences: ParsedSentence[],
  koreanText: string
): { english: string; korean: string | null; confidence: number }[] {
  const koreanSentences = splitKoreanSentences(koreanText)
  
  // 개수가 같으면 1:1 매칭
  if (englishSentences.length === koreanSentences.length) {
    return englishSentences.map((en, idx) => ({
      english: en.content,
      korean: koreanSentences[idx],
      confidence: 0.9,
    }))
  }

  // 개수가 다르면 매칭 시도 (간단한 휴리스틱)
  const result: { english: string; korean: string | null; confidence: number }[] = []
  
  let krIdx = 0
  for (let enIdx = 0; enIdx < englishSentences.length; enIdx++) {
    if (krIdx < koreanSentences.length) {
      result.push({
        english: englishSentences[enIdx].content,
        korean: koreanSentences[krIdx],
        confidence: 0.6, // 불확실한 매칭
      })
      krIdx++
    } else {
      result.push({
        english: englishSentences[enIdx].content,
        korean: null,
        confidence: 0,
      })
    }
  }

  return result
}

/**
 * 문장 분리 메인 함수 (Regex Only)
 */
export function splitSentences(
  text: string,
  koreanText?: string | null
): SentenceSplitResult {
  const sentences = splitSentencesByRegex(text)
  const confidence = calculateOverallConfidence(sentences)

  // 한글 번역이 있으면 매칭 시도
  if (koreanText) {
    const matched = matchSentences(sentences, koreanText)
    const sentencesWithKorean = sentences.map((s, idx) => ({
      ...s,
      koreanTranslation: matched[idx]?.korean || undefined,
    }))
    
    return {
      sentences: sentencesWithKorean,
      confidence,
      method: 'regex',
      warnings: sentences
        .filter(s => (s.issues?.length || 0) > 0)
        .map(s => `문장 ${s.no}: ${s.issues?.join(', ')}`),
    }
  }

  return {
    sentences,
    confidence,
    method: 'regex',
    warnings: sentences
      .filter(s => (s.issues?.length || 0) > 0)
      .map(s => `문장 ${s.no}: ${s.issues?.join(', ')}`),
  }
}
