import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { splitSentences, analyzeTranslation, splitSentencesByRegex, calculateOverallConfidence } from '@/lib/sentence-splitter'
import { AI_MODELS, ModelId, ParsedSentence, SentenceSplitResult, KoreanIssue, SentencePair } from '@/types'
import { classifyAIError, createDetailedError, getAlternativeModel, AIErrorInfo } from '@/lib/ai-errors'

// AI 클라이언트 초기화 (지연 로딩)
let openai: OpenAI | null = null
let anthropic: Anthropic | null = null
let genAI: GoogleGenerativeAI | null = null

// 🔧 API 키 상태 로깅 (서버 시작 시)
console.log('=== AI API 키 상태 ===')
console.log('GOOGLE_GEMINI_API_KEY:', process.env.GOOGLE_GEMINI_API_KEY ? `설정됨 (${process.env.GOOGLE_GEMINI_API_KEY.substring(0, 10)}...)` : '❌ 미설정')
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `설정됨 (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ 미설정')
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `설정됨 (${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...)` : '❌ 미설정')
console.log('======================')

function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return openai
}

function getAnthropic() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return anthropic
}

function getGoogleAI() {
  if (!genAI && process.env.GOOGLE_GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)
  }
  return genAI
}

// AI 문장 분리 프롬프트 (강화 버전)
const SENTENCE_SPLIT_PROMPT = `You are an expert at splitting English text into grammatically complete sentences.

**CRITICAL RULES (MUST FOLLOW):**
1. **NEVER modify the original text** - preserve every character, space, and punctuation EXACTLY as given
2. Each sentence must be grammatically complete
3. Handle abbreviations correctly (Dr., Mr., Mrs., Ms., U.S., U.K., e.g., i.e., etc., vs.) - do NOT split at these
4. Quoted text with punctuation inside (e.g., "wrong." or "Hello!") - the quote is part of the sentence
5. Sentences end with: period(.), exclamation(!), question(?)
6. Quote marks can follow ending punctuation: ."  !"  ?"

**VALIDATION:**
- When you concatenate all sentence contents with single spaces, it MUST exactly match the original text
- Do NOT add, remove, change, or correct any characters

Output format (JSON only, no markdown):
{
  "sentences": [
    {"no": 1, "content": "First sentence exactly as original.", "confidence": 0.95}
  ],
  "overall_confidence": 0.96
}

Confidence: 0.0-1.0, lower for abbreviations/quotes/complex punctuation.

Text to split:`

// 번역 검증/생성 프롬프트
const TRANSLATION_VERIFY_PROMPT = `You are a translation quality checker. Verify if the Korean translation matches the English sentence.

Output format (JSON only):
{
  "score": 8,
  "issues": ["Minor issues if any"],
  "suggestion": "Better translation if needed, or null if good"
}

Score: 1-10 (10 = perfect match)

English:`

/**
 * AI를 사용한 문장 분리
 */
async function splitWithAI(
  text: string,
  model: ModelId,
  koreanText?: string | null
): Promise<SentenceSplitResult> {
  const startTime = Date.now()
  
  const prompt = `${SENTENCE_SPLIT_PROMPT}
"${text}"

${koreanText ? `
Korean translation (for reference, try to match sentence counts):
"${koreanText}"` : ''}`

  let resultText = ''
  const modelInfo = AI_MODELS[model]

  try {
    switch (modelInfo.provider) {
      case 'openai': {
        const client = getOpenAI()
        if (!client) throw new Error('OpenAI API key not configured')
        
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        })
        resultText = response.choices[0].message?.content || ''
        break
      }
      
      case 'anthropic': {
        const client = getAnthropic()
        if (!client) throw new Error('Anthropic API key not configured')
        
        const response = await client.messages.create({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        })
        resultText = response.content[0]?.type === 'text' ? response.content[0].text : ''
        break
      }
      
      case 'google': {
        const client = getGoogleAI()
        if (!client) throw new Error('Google Gemini API key not configured')
        
        const geminiModel = client.getGenerativeModel({ 
          model,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        })
        const response = await geminiModel.generateContent(prompt)
        resultText = response.response.text()
        break
      }
      
      default:
        throw new Error(`Unsupported model provider: ${modelInfo.provider}`)
    }

    // JSON 파싱
    const parsed = JSON.parse(resultText)
    
    // 한글 번역 매칭 (있는 경우)
    let sentences: ParsedSentence[] = parsed.sentences.map((s: { no: number; content: string; confidence?: number }) => ({
      no: s.no,
      content: s.content,
      wordCount: s.content.split(/\s+/).length,
      confidence: s.confidence || 0.9,
      issues: [],
    }))

    // 한글 번역 매칭
    if (koreanText) {
      const koreanSentences = koreanText
        .split(/(?<=[.!?다요죠음함])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)

      if (koreanSentences.length === sentences.length) {
        sentences = sentences.map((s, idx) => ({
          ...s,
          koreanTranslation: koreanSentences[idx],
        }))
      }
    }

    return {
      sentences,
      confidence: parsed.overall_confidence || 0.95,
      method: 'ai',
      model,
    }
  } catch (error) {
    console.error('AI sentence split error:', error)
    throw error
  }
}

/**
 * 하이브리드 문장 분리 (Regex + AI 검증)
 */
async function splitHybrid(
  text: string,
  model: ModelId,
  koreanText?: string | null
): Promise<SentenceSplitResult> {
  // 1단계: Regex 분리
  const regexResult = splitSentences(text, koreanText)
  
  // 신뢰도가 높으면 그대로 반환
  if (regexResult.confidence >= 0.9 && (!regexResult.warnings || regexResult.warnings.length === 0)) {
    return {
      ...regexResult,
      method: 'regex',
    }
  }
  
  // 2단계: AI 검증 필요
  const aiResult = await splitWithAI(text, model, koreanText)
  return {
    ...aiResult,
    method: 'hybrid',
  }
}

/**
 * AI 검증 모드 - Regex 결과를 AI가 항상 검증/수정 (원문 보존 필수)
 */
async function splitWithAIVerification(
  text: string,
  model: ModelId,
  koreanText?: string | null
): Promise<SentenceSplitResult> {
  // 1단계: Regex 분리
  const regexResult = splitSentences(text, koreanText)
  
  // 2단계: AI에게 Regex 결과 검증 요청
  const verifyPrompt = `You are validating sentence boundaries. Your job is to verify and correct if needed.

**CRITICAL: The original text MUST be preserved EXACTLY. Never modify, correct, or paraphrase any character.**

Original text:
"${text}"

Regex split result (${regexResult.sentences.length} sentences):
${regexResult.sentences.map(s => `${s.no}. "${s.content}"`).join('\n')}

Review and correct the split if needed. Common issues:
1. Abbreviations (Dr., Mr., U.S., e.g., i.e.) should NOT cause splits
2. Quoted text ending with punctuation ("wrong." or "Hello!") - the quote ends the sentence
3. Each sentence must be grammatically complete

**VALIDATION REQUIREMENT:**
- Concatenating all your sentence contents with spaces must EXACTLY match the original text
- If you change anything in the text itself (not just splits), return the regex result unchanged

Output JSON only (no markdown):
{
  "sentences": [{"no": 1, "content": "exact text from original", "confidence": 0.95}],
  "overall_confidence": 0.96,
  "corrections": ["list of corrections made, or empty if none"]
}`

  const modelInfo = AI_MODELS[model]
  let resultText = ''

  try {
    switch (modelInfo.provider) {
      case 'openai': {
        const client = getOpenAI()
        if (!client) throw new Error('OpenAI API key not configured')
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: verifyPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        })
        resultText = response.choices[0].message?.content || ''
        break
      }
      case 'anthropic': {
        const client = getAnthropic()
        if (!client) throw new Error('Anthropic API key not configured')
        const response = await client.messages.create({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: verifyPrompt }],
        })
        resultText = response.content[0]?.type === 'text' ? response.content[0].text : ''
        break
      }
      case 'google': {
        const client = getGoogleAI()
        if (!client) throw new Error('Google Gemini API key not configured')
        const geminiModel = client.getGenerativeModel({ 
          model,
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        })
        const response = await geminiModel.generateContent(verifyPrompt)
        resultText = response.response.text()
        break
      }
      default:
        throw new Error(`Unsupported provider: ${modelInfo.provider}`)
    }

    const parsed = JSON.parse(resultText)
    
    // 원문 검증: AI 결과가 원문과 일치하는지 확인
    const aiText = parsed.sentences.map((s: { content: string }) => s.content).join(' ')
    const originalNormalized = text.replace(/\s+/g, ' ').trim()
    const aiNormalized = aiText.replace(/\s+/g, ' ').trim()
    
    if (originalNormalized !== aiNormalized) {
      console.error('AI modified original text - retry needed')
      console.error('Original:', originalNormalized.substring(0, 100))
      console.error('AI result:', aiNormalized.substring(0, 100))
      
      // AI 결과 거부 - 에러로 처리하여 재시도 유도
      throw new Error('AI_TEXT_MODIFIED: AI가 원문을 변형했습니다. 다시 시도해주세요.')
    }

    // 한글 번역 매칭
    let sentences: ParsedSentence[] = parsed.sentences.map((s: { no: number; content: string; confidence?: number }) => ({
      no: s.no,
      content: s.content,
      wordCount: s.content.split(/\s+/).length,
      confidence: s.confidence || 0.95,
      issues: [],
    }))

    if (koreanText) {
      const koreanSentences = koreanText
        .split(/(?<=[.!?다요죠음함])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)

      if (koreanSentences.length === sentences.length) {
        sentences = sentences.map((s, idx) => ({
          ...s,
          koreanTranslation: koreanSentences[idx],
        }))
      }
    }

    return {
      sentences,
      confidence: parsed.overall_confidence || 0.95,
      method: 'ai-verify',
      model,
      warnings: parsed.corrections?.length > 0 ? parsed.corrections : undefined,
    }
  } catch (error) {
    // 상세 에러 분류
    const detailedError = createDetailedError(error, {
      model,
      provider: AI_MODELS[model]?.provider,
      action: 'ai-verify'
    })
    
    console.error('AI verification failed:', {
      errorType: detailedError.errorInfo.type,
      message: detailedError.errorInfo.message,
    })
    
    // AI 실패 시 에러 throw (Regex 폴백 없음)
    const errorWithInfo = new Error(detailedError.errorInfo.message) as Error & { 
      aiError: typeof detailedError.errorInfo
    }
    errorWithInfo.aiError = detailedError.errorInfo
    throw errorWithInfo
  }
}

/**
 * 🔒 텍스트 정규화 (비교용) - 강화 버전
 * - 모든 종류의 공백 문자를 단일 공백으로 통일
 * - 유니코드 공백, 전각 공백, 줄바꿈 등 처리
 */
function normalizeText(text: string): string {
  if (!text) return ''
  return text
    // 모든 종류의 공백/줄바꿈을 단일 공백으로
    .replace(/[\s\u00A0\u2000-\u200B\u2028\u2029\u3000\uFEFF]+/g, ' ')
    // 다양한 대시/하이픈 문자를 일반 하이픈으로 통일 (―, —, –, ‐ 등)
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    // 다양한 따옴표를 일반 따옴표로 통일 (', ', ", " 등)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    // 일반 따옴표 제거 (AI가 추가하는 경우 대응)
    .replace(/^["']+|["']+$/g, '')  // 문자열 양끝 따옴표 제거
    .replace(/["']\s*$/g, '')  // 끝의 따옴표 제거
    .replace(/^\s*["']/g, '')  // 시작의 따옴표 제거
    // 앞뒤 공백 제거
    .trim()
}

/**
 * 🔒 유연한 텍스트 비교 (공백 무시)
 * - 공백 차이는 무시하고 실제 내용만 비교
 */
function compareTextsFlexibly(original: string, extracted: string): { isMatch: boolean; diff?: string } {
  const normalizedOriginal = normalizeText(original)
  const normalizedExtracted = normalizeText(extracted)
  
  if (normalizedOriginal === normalizedExtracted) {
    return { isMatch: true }
  }
  
  // 차이점 찾기 (디버깅용)
  const maxLen = Math.min(normalizedOriginal.length, normalizedExtracted.length, 100)
  let diffIndex = -1
  for (let i = 0; i < maxLen; i++) {
    if (normalizedOriginal[i] !== normalizedExtracted[i]) {
      diffIndex = i
      break
    }
  }
  
  if (diffIndex >= 0) {
    const context = 20
    const start = Math.max(0, diffIndex - context)
    const originalSnippet = normalizedOriginal.substring(start, diffIndex + context)
    const extractedSnippet = normalizedExtracted.substring(start, diffIndex + context)
    return { 
      isMatch: false, 
      diff: `위치 ${diffIndex}: 원본[${originalSnippet}] vs AI[${extractedSnippet}]` 
    }
  }
  
  // 길이 차이
  return { 
    isMatch: false, 
    diff: `길이 차이: 원본 ${normalizedOriginal.length}자 vs AI ${normalizedExtracted.length}자` 
  }
}

/**
 * 🛡️ 병렬 문장 추출 (영어+한글 동시 처리)
 * 핵심 원칙:
 * - 영어 원문: 절대 수정 불가
 * - 한글 해석: 절대 수정 불가
 * - 문제 발견 시: 관리자 알림만
 */
async function extractParallelSentences(
  englishText: string,
  koreanText: string,
  model: ModelId
): Promise<SentenceSplitResult> {
  // 줄바꿈을 공백으로 정규화 (셀 내 줄바꿈 처리)
  const normalizedEnglish = englishText.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
  const normalizedKorean = koreanText.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ')
  
  // 원본 저장 (검증용) - 정규화된 버전 사용
  const originalEnglish = normalizedEnglish
  const originalKorean = normalizedKorean
  
  const prompt = `You are extracting sentence pairs from English text and its Korean translation.

**🔴 ABSOLUTE RULES - VIOLATION = COMPLETE FAILURE:**
1. EXTRACT text EXACTLY as given - NO modifications, corrections, or paraphrasing
2. Every character, space, and punctuation must match the original EXACTLY
3. You are a SPLITTER, not an EDITOR - never "fix" anything
4. If unsure about a split, keep sentences together rather than splitting wrong

**TASK:**
Split into sentence pairs. Each pair = one English sentence + its corresponding Korean translation.

**INPUT:**
English:
"${normalizedEnglish}"

Korean:
"${normalizedKorean}"

**OUTPUT (JSON only, no markdown):**
{
  "pairs": [
    {"no": 1, "english": "Exact English text.", "korean": "정확한 한글 텍스트."}
  ],
  "confidence": 0.95,
  "korean_issues": [
    {"type": "missing|incomplete|quality", "pairNo": 2, "description": "문제 설명"}
  ]
}

**KOREAN ISSUE TYPES (report but NEVER fix):**
- missing: 번역이 누락된 경우
- incomplete: 번역이 불완전한 경우  
- quality: 번역 품질이 의심되는 경우

REMEMBER: Report issues but NEVER modify any text!`

  const modelInfo = AI_MODELS[model]
  let resultText = ''

  try {
    switch (modelInfo.provider) {
      case 'openai': {
        const client = getOpenAI()
        if (!client) throw new Error('OpenAI API key not configured')
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        })
        resultText = response.choices[0].message?.content || ''
        break
      }
      case 'anthropic': {
        const client = getAnthropic()
        if (!client) throw new Error('Anthropic API key not configured')
        const response = await client.messages.create({
          model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        })
        resultText = response.content[0]?.type === 'text' ? response.content[0].text : ''
        break
      }
      case 'google': {
        console.log(`🔵 Google Gemini 호출 시작 - 모델: ${model}`)
        const client = getGoogleAI()
        if (!client) {
          console.error('❌ Google Gemini API 키가 설정되지 않았습니다')
          throw new Error('Google Gemini API key not configured - .env.local에 GOOGLE_GEMINI_API_KEY를 설정하세요')
        }
        try {
          const geminiModel = client.getGenerativeModel({ 
            model,
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
          })
          console.log(`🔵 Gemini 모델 생성 완료, 콘텐츠 생성 시작...`)
          const response = await geminiModel.generateContent(prompt)
          resultText = response.response.text()
          console.log(`✅ Google Gemini 응답 수신 완료 (${resultText.length}자)`)
        } catch (geminiError) {
          console.error('❌ Google Gemini API 오류:', geminiError)
          throw geminiError
        }
        break
      }
      default:
        throw new Error(`Unsupported provider: ${modelInfo.provider}`)
    }

    console.log(`📋 AI 응답 파싱 중...`)
    const parsed = JSON.parse(resultText)
    const pairs: SentencePair[] = parsed.pairs || []
    console.log(`✅ 파싱 완료: ${pairs.length}개 문장 쌍 추출`)
    
    // ═══════════════════════════════════════════════════════════
    // 🛡️ 영어 원문 검증 (절대 불가침) - 유연한 비교
    // ═══════════════════════════════════════════════════════════
    const extractedEnglish = pairs.map(p => p.english || '').filter(Boolean).join(' ')
    const englishComparison = compareTextsFlexibly(originalEnglish, extractedEnglish)
    
    if (!englishComparison.isMatch) {
      console.error('❌ AI가 영어 원문을 수정함 - 재시도 필요')
      console.error('차이점:', englishComparison.diff)
      
      // AI 결과 거부 - 에러로 처리하여 재시도 유도
      throw new Error('AI_TEXT_MODIFIED: AI가 영어 원문을 변형했습니다. 다시 시도해주세요.')
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🛡️ 한글 해석 검증 (유연하게 처리 - 경고만 표시)
    // ═══════════════════════════════════════════════════════════
    const extractedKorean = pairs.map(p => p.korean || '').filter(Boolean).join(' ')
    const koreanComparison = compareTextsFlexibly(originalKorean, extractedKorean)
    
    const koreanIssues: KoreanIssue[] = []
    
    if (!koreanComparison.isMatch) {
      // 길이 차이 계산 (미미한 차이는 무시)
      const originalLen = normalizeText(originalKorean).length
      const extractedLen = normalizeText(extractedKorean).length
      const lengthDiff = Math.abs(originalLen - extractedLen)
      const lengthRatio = originalLen > 0 ? lengthDiff / originalLen : 0
      
      // 5자 이내 또는 1% 이내 차이는 무시 (공백, 문장부호 정도)
      if (lengthDiff <= 5 || lengthRatio <= 0.01) {
        console.log('ℹ️ 한글 미미한 차이 무시:', koreanComparison.diff, `(${lengthDiff}자, ${(lengthRatio * 100).toFixed(1)}%)`)
      } else {
        // 유의미한 차이만 경고
        console.warn('⚠️ AI가 한글 해석을 일부 수정함 - 허용됨')
        console.warn('차이점:', koreanComparison.diff, `(${lengthDiff}자, ${(lengthRatio * 100).toFixed(1)}%)`)
        
        // 에러 대신 경고로 기록 → 사용자가 확인
        koreanIssues.push({
          type: 'modified',
          pairNo: 0,
          description: `한글 해석이 일부 수정됨: ${koreanComparison.diff}`,
          severity: 'medium',
          needsReview: true,
        })
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // 🔍 한글 품질 문제 감지 → 관리자 알림 (수정 X)
    // ═══════════════════════════════════════════════════════════
    
    // AI가 감지한 문제들 추가
    if (parsed.korean_issues && Array.isArray(parsed.korean_issues)) {
      for (const issue of parsed.korean_issues) {
        koreanIssues.push({
          type: issue.type || 'quality',
          pairNo: issue.pairNo,
          description: issue.description || '한글 번역 품질 문제',
          severity: 'medium',
          needsReview: true,
        })
      }
    }
    
    // 추가 품질 체크 (자동 감지)
    for (const pair of pairs) {
      // 영어 원문 누락 체크
      if (!pair.english || pair.english.trim().length === 0) {
        console.warn(`⚠️ 문장 ${pair.no}의 영어 원문이 없습니다 - 건너뜀`)
        continue
      }
      
      // 한글 번역 누락
      if (!pair.korean || pair.korean.trim().length === 0) {
        koreanIssues.push({
          type: 'missing',
          pairNo: pair.no,
          description: `문장 ${pair.no}의 한글 번역이 없습니다`,
          severity: 'high',
          needsReview: true,
        })
      }
      
      // 한글이 너무 짧음 (영어 대비) - 임계값 완화: 단어 × 1.2
      const enWords = (pair.english || '').split(/\s+/).length
      const krChars = (pair.korean?.match(/[가-힣]/g) || []).length
      // 영어 10단어 이상이고, 한글이 영어 단어 수 × 1.2보다 적은 경우만 경고
      if (enWords > 10 && krChars < enWords * 1.2) {
        koreanIssues.push({
          type: 'incomplete',
          pairNo: pair.no,
          description: `문장 ${pair.no}의 한글 번역이 짧을 수 있습니다 (영어 ${enWords}단어, 한글 ${krChars}자) - 참고용`,
          severity: 'low',  // medium → low로 하향
          needsReview: false,  // 자동 알림 비활성화
        })
      }
      
      // 영어 단어가 한글에 그대로 있는 경우 (번역 안 됨) - 임계값 완화
      const englishWordsInKorean = pair.korean?.match(/[a-zA-Z]{4,}/g) || []
      if (englishWordsInKorean.length > 5) {  // 2 → 5로 완화
        koreanIssues.push({
          type: 'quality',
          pairNo: pair.no,
          description: `문장 ${pair.no}에 영어 단어가 많습니다: ${englishWordsInKorean.slice(0, 3).join(', ')} - 참고용`,
          severity: 'low',
          needsReview: false,
        })
      }
    }
    
    // 결과 생성 (유효한 pair만)
    const sentences: ParsedSentence[] = pairs
      .filter(p => p.english && p.english.trim().length > 0)
      .map(p => ({
        no: p.no,
        content: p.english,  // 원문 그대로
        koreanTranslation: p.korean || '',  // 해석 그대로
        wordCount: (p.english || '').split(/\s+/).length,
        confidence: p.confidence || 0.95,
        issues: [],
      }))
    
    return {
      sentences,
      confidence: parsed.confidence || 0.95,
      method: 'parallel',
      model,
      warnings: koreanIssues.length > 0 
        ? [`⚠️ 한글 번역에 ${koreanIssues.length}개의 문제가 발견되었습니다. 검토가 필요합니다.`]
        : undefined,
      koreanIssues: koreanIssues.length > 0 ? koreanIssues : undefined,
    }
  } catch (error) {
    // 상세 에러 분류
    const detailedError = createDetailedError(error, {
      model,
      provider: AI_MODELS[model]?.provider,
      action: 'parallel-extraction'
    })
    
    console.error('Parallel extraction failed:', {
      errorType: detailedError.errorInfo.type,
      message: detailedError.errorInfo.message,
      originalError: detailedError.originalError,
      model,
    })
    
    // 대안 모델 추천
    const alternativeModel = getAlternativeModel(model, detailedError.errorInfo.type)
    
    // AI 실패 시 에러 throw (Regex 폴백 없음)
    const errorWithInfo = new Error(detailedError.errorInfo.message) as Error & { 
      aiError: typeof detailedError.errorInfo & { alternativeModel?: string }
    }
    errorWithInfo.aiError = {
      ...detailedError.errorInfo,
      alternativeModel,
    }
    throw errorWithInfo
  }
}

/**
 * POST /api/sentence-split
 * 문장 분리 API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      text, 
      koreanText,
      model = 'gemini-2.0-flash' as ModelId,
      mode = 'parallel', // 'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel'
      includeTranslationAnalysis = true,
    } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    let result: SentenceSplitResult

    switch (mode) {
      case 'regex':
        result = splitSentences(text, koreanText)
        break
      
      case 'ai':
        result = await splitWithAI(text, model as ModelId, koreanText)
        break
      
      case 'ai-verify':
        result = await splitWithAIVerification(text, model as ModelId, koreanText)
        break
      
      case 'hybrid':
        result = await splitHybrid(text, model as ModelId, koreanText)
        break
      
      case 'parallel':
      default:
        // 한글 번역이 있으면 병렬 추출, 없으면 AI 검증
        if (koreanText && koreanText.trim().length > 0) {
          result = await extractParallelSentences(text, koreanText, model as ModelId)
        } else {
          result = await splitWithAIVerification(text, model as ModelId, koreanText)
        }
        break
    }

    // 번역 분석 (옵션)
    let translationStatus = null
    if (includeTranslationAnalysis && koreanText) {
      const baseAnalysis = analyzeTranslation(text, koreanText)
      
      // AI parallel 모드에서 성공적으로 분리했다면 AI 결과를 신뢰
      if (result.method === 'parallel' && result.sentences.length > 0) {
        const koreanSentenceCount = result.sentences.filter(s => s.koreanTranslation).length
        translationStatus = {
          ...baseAnalysis,
          // AI 분리 결과로 덮어쓰기
          sentenceCount: { 
            english: result.sentences.length, 
            korean: koreanSentenceCount 
          },
          alignment: result.sentences.length === koreanSentenceCount ? 'perfect' : baseAnalysis.alignment,
          // AI가 성공했으므로 신뢰도 상향
          quality: result.confidence > 0.9 ? 'good' : baseAnalysis.quality,
          needsAI: false,  // AI가 이미 처리함
          // AI 분리 성공 시 Regex 불일치 경고 제거
          signals: baseAnalysis.signals.filter((s: string) => 
            !s.includes('문장 개수 불일치')
          ),
        }
      } else {
        translationStatus = baseAnalysis
      }
    }

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      ...result,
      translationStatus,
      responseTime,
      stats: {
        sentenceCount: result.sentences.length,
        totalWords: result.sentences.reduce((sum, s) => sum + s.wordCount, 0),
        avgWordsPerSentence: result.sentences.length > 0 
          ? Math.round(result.sentences.reduce((sum, s) => sum + s.wordCount, 0) / result.sentences.length)
          : 0,
      },
    })
  } catch (error) {
    console.error('Sentence split error:', error)
    
    // AI 에러 정보가 있으면 포함
    const aiError = (error as Error & { aiError?: unknown })?.aiError
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        aiError,
        canRetry: true,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sentence-split/batch
 * 배치 문장 분리 (여러 지문)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      passages,
      model = 'gemini-2.0-flash' as ModelId,
      mode = 'parallel',
    } = body

    if (!passages || !Array.isArray(passages) || passages.length === 0) {
      return NextResponse.json(
        { error: 'Passages array is required' },
        { status: 400 }
      )
    }

    const results = []
    const startTime = Date.now()

    for (const passage of passages) {
      try {
        let result: SentenceSplitResult

        switch (mode) {
          case 'regex':
            result = splitSentences(passage.content, passage.koreanTranslation)
            break
          
          case 'ai':
            result = await splitWithAI(passage.content, model as ModelId, passage.koreanTranslation)
            break
          
          case 'ai-verify':
            result = await splitWithAIVerification(passage.content, model as ModelId, passage.koreanTranslation)
            break
          
          case 'hybrid':
            result = await splitHybrid(passage.content, model as ModelId, passage.koreanTranslation)
            break
          
          case 'parallel':
          default:
            // 한글 번역이 있으면 병렬 추출, 없으면 AI 검증
            if (passage.koreanTranslation && passage.koreanTranslation.trim().length > 0) {
              result = await extractParallelSentences(passage.content, passage.koreanTranslation, model as ModelId)
            } else {
              result = await splitWithAIVerification(passage.content, model as ModelId, passage.koreanTranslation)
            }
            break
        }

        const translationStatus = passage.koreanTranslation 
          ? analyzeTranslation(passage.content, passage.koreanTranslation)
          : null

        results.push({
          passageId: passage.id,
          passageName: passage.name,
          success: true,
          ...result,
          translationStatus,
        })
      } catch (error) {
        results.push({
          passageId: passage.id,
          passageName: passage.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    const responseTime = Date.now() - startTime
    const successCount = results.filter(r => r.success).length

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: passages.length,
        success: successCount,
        failed: passages.length - successCount,
        totalSentences: results.reduce((sum, r) => sum + (r.sentences?.length || 0), 0),
      },
      responseTime,
      model,
      mode,
    })
  } catch (error) {
    console.error('Batch sentence split error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

