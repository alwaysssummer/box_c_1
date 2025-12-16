/**
 * 프레임 + 블록 기반 출력 시스템 - 레이아웃 엔진
 * 
 * 핵심 기능:
 * - 블록들을 페이지에 배치
 * - 오버플로우 처리 (축소 또는 페이지 분할)
 * - 지문형/문장형 각각 처리
 */

import type {
  Block,
  BlockType,
  BlockData,
  PrintLayout,
  PassageLayout,
  SentenceLayout,
  PrintStyle,
  PrintPage,
  LayoutResult,
  OverflowConfig,
  SentenceData,
} from './types'

import {
  DEFAULT_OVERFLOW_CONFIG,
  A4_SIZE_PX,
} from './constants'

// ============================================
// 1. 메인 레이아웃 함수
// ============================================

/**
 * 블록들을 페이지에 배치
 */
export function calculateLayout(
  blocks: Block[],
  layout: PrintLayout,
  style: PrintStyle,
  overflowConfig: OverflowConfig = DEFAULT_OVERFLOW_CONFIG
): LayoutResult {
  if (layout.category === 'passage') {
    return layoutPassage(blocks, layout, style, overflowConfig)
  } else {
    return layoutSentence(blocks, layout, style, overflowConfig)
  }
}

// ============================================
// 2. 지문형 레이아웃
// ============================================

/**
 * 지문형 레이아웃 계산
 */
function layoutPassage(
  blocks: Block[],
  layout: PassageLayout,
  style: PrintStyle,
  overflowConfig: OverflowConfig
): LayoutResult {
  const pages: PrintPage[] = []
  let currentPageBlocks: Block[] = []
  let currentScale = 1.0
  
  // 사용 가능한 페이지 높이 계산
  const pageHeight = A4_SIZE_PX.height - 
    (style.padding.top + style.padding.bottom) * 3.78 // mm to px
  
  // 블록들을 순회하며 페이지에 배치
  for (const block of blocks) {
    currentPageBlocks.push(block)
    
    // 예상 높이 계산
    const estimatedHeight = estimateBlocksHeight(currentPageBlocks, style, layout.columns)
    
    // 오버플로우 체크
    if (estimatedHeight > pageHeight * currentScale) {
      // 자동 축소 시도
      if (overflowConfig.autoScale && currentScale > overflowConfig.minScale) {
        currentScale = Math.max(
          overflowConfig.minScale,
          pageHeight / estimatedHeight
        )
      }
      
      // 여전히 넘치면 페이지 분할
      if (estimatedHeight > pageHeight / overflowConfig.minScale) {
        // 마지막 블록 제외하고 현재 페이지 완성
        currentPageBlocks.pop()
        
        if (currentPageBlocks.length > 0) {
          pages.push({
            pageNumber: pages.length + 1,
            blocks: [...currentPageBlocks],
            scale: currentScale,
          })
        }
        
        // 새 페이지 시작
        currentPageBlocks = [block]
        currentScale = 1.0
      }
    }
  }
  
  // 남은 블록들로 마지막 페이지 생성
  if (currentPageBlocks.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      blocks: currentPageBlocks,
      scale: currentScale,
    })
  }
  
  return {
    pages,
    overflow: pages.length > 1 || currentScale < 1.0,
    appliedScale: currentScale,
  }
}

// ============================================
// 3. 문장형 레이아웃
// ============================================

/**
 * 문장형 레이아웃 계산
 */
function layoutSentence(
  blocks: Block[],
  layout: SentenceLayout,
  style: PrintStyle,
  overflowConfig: OverflowConfig
): LayoutResult {
  const pages: PrintPage[] = []
  let currentPageBlocks: Block[] = []
  let currentScale = 1.0
  
  // 사용 가능한 페이지 높이
  const pageHeight = A4_SIZE_PX.height - 
    (style.padding.top + style.padding.bottom) * 3.78
  
  // 블록들을 순회하며 페이지에 배치
  for (const block of blocks) {
    currentPageBlocks.push(block)
    
    // 문장형은 문장 개수 기반으로 높이 추정
    const sentenceCount = block.data.sentences?.length || 1
    const estimatedHeight = sentenceCount * 120 * currentScale // 문장당 약 120px
    
    if (estimatedHeight > pageHeight) {
      // 자동 축소
      if (overflowConfig.autoScale && currentScale > overflowConfig.minScale) {
        currentScale = Math.max(
          overflowConfig.minScale,
          pageHeight / estimatedHeight
        )
      }
      
      // 페이지 분할 필요 시
      if (estimatedHeight > pageHeight / overflowConfig.minScale) {
        currentPageBlocks.pop()
        
        if (currentPageBlocks.length > 0) {
          pages.push({
            pageNumber: pages.length + 1,
            blocks: [...currentPageBlocks],
            scale: currentScale,
          })
        }
        
        currentPageBlocks = [block]
        currentScale = 1.0
      }
    }
  }
  
  if (currentPageBlocks.length > 0) {
    pages.push({
      pageNumber: pages.length + 1,
      blocks: currentPageBlocks,
      scale: currentScale,
    })
  }
  
  return {
    pages,
    overflow: pages.length > 1 || currentScale < 1.0,
    appliedScale: currentScale,
  }
}

// ============================================
// 4. 높이 추정 유틸리티
// ============================================

/**
 * 블록들의 총 높이 추정
 */
function estimateBlocksHeight(
  blocks: Block[],
  style: PrintStyle,
  columns: number
): number {
  let totalHeight = 0
  
  for (const block of blocks) {
    totalHeight += estimateBlockHeight(block, style)
  }
  
  // 2단일 경우 높이를 절반으로 (대략적)
  if (columns === 2) {
    totalHeight = totalHeight / 1.5 // 완전히 절반은 아님
  }
  
  return totalHeight
}

/**
 * 단일 블록의 높이 추정
 */
function estimateBlockHeight(block: Block, style: PrintStyle): number {
  const lineHeight = style.fontSize * style.lineHeight * 1.333 // pt to px
  
  switch (block.type) {
    case 'passage': {
      // 지문: 글자 수 기반
      const charCount = block.data.body?.length || 0
      const charsPerLine = 40 // 대략적인 줄당 글자 수
      const lines = Math.ceil(charCount / charsPerLine)
      return lines * lineHeight + 40 // 여백 포함
    }
    
    case 'question': {
      // 문제: 지시문 + 선택지
      let height = 30 // 기본 높이
      
      // 지시문
      if (block.data.instruction) {
        height += lineHeight * 2
      }
      
      // 본문
      if (block.data.body) {
        const charCount = block.data.body.length
        const lines = Math.ceil(charCount / 40)
        height += lines * lineHeight
      }
      
      // 선택지
      const choiceCount = block.data.choices?.length || 0
      height += choiceCount * lineHeight * 1.5
      
      return height + style.questionSpacing
    }
    
    case 'givenBox': {
      // 주어진 글 박스
      const charCount = block.data.givenBoxContent?.length || block.data.body?.length || 0
      const lines = Math.ceil(charCount / 35)
      return lines * lineHeight + 60 // 박스 테두리 포함
    }
    
    case 'answer':
    case 'explanation':
      return lineHeight * 3
    
    case 'original':
    case 'translation':
    case 'vocabulary':
    case 'grammar':
    case 'structure': {
      // 문장형: 문장 개수 기반
      const sentenceCount = block.data.sentences?.length || 1
      return sentenceCount * 100
    }
    
    default:
      return 100
  }
}

// ============================================
// 5. 블록 생성 유틸리티
// ============================================

/**
 * 지문 블록 생성
 */
export function createPassageBlock(
  id: string,
  body: string,
  passageId?: string,
  passageName?: string
): Block {
  return {
    id,
    type: 'passage',
    data: {
      body,
      passageId,
      passageName,
    },
  }
}

/**
 * 문제 블록 생성
 */
export function createQuestionBlock(
  id: string,
  data: {
    instruction?: string
    body?: string
    choices?: string[]
    answer?: string | number
    questionNumber?: number
  }
): Block {
  return {
    id,
    type: 'question',
    data,
  }
}

/**
 * 주어진 글 블록 생성 (순서/삽입용)
 */
export function createGivenBoxBlock(
  id: string,
  content: string
): Block {
  return {
    id,
    type: 'givenBox',
    data: {
      givenBoxContent: content,
    },
  }
}

/**
 * 문장형 블록 생성
 */
export function createSentenceBlock(
  id: string,
  type: 'original' | 'translation' | 'vocabulary' | 'grammar' | 'structure',
  sentences: SentenceData[]
): Block {
  return {
    id,
    type,
    data: {
      sentences,
    },
  }
}

// ============================================
// 6. 데이터 변환 유틸리티
// ============================================

/**
 * 기존 문제 데이터를 블록으로 변환
 */
export interface LegacyQuestion {
  id: string
  instruction?: string
  body?: string
  choices?: string | string[]
  answer?: string | number
  explanation?: string
  passage_id?: string
  passage_name?: string
  question_type_name?: string
  // 순서/삽입용
  givenBox?: string
}

/**
 * 기존 문제 데이터를 블록 배열로 변환
 */
export function convertToBlocks(
  questions: LegacyQuestion[],
  options: {
    includePassage?: boolean
    showPassageOnce?: boolean
    includeAnswer?: boolean
    includeExplanation?: boolean
  } = {}
): Block[] {
  const {
    includePassage = true,
    showPassageOnce = true,
    includeAnswer = false,
    includeExplanation = false,
  } = options
  
  const blocks: Block[] = []
  const shownPassages = new Set<string>()
  let questionNumber = 1
  
  for (const q of questions) {
    // 지문 블록 (옵션에 따라)
    if (includePassage && q.body && q.passage_id) {
      const shouldShowPassage = !showPassageOnce || !shownPassages.has(q.passage_id)
      
      if (shouldShowPassage) {
        blocks.push(createPassageBlock(
          `passage-${q.passage_id}`,
          q.body,
          q.passage_id,
          q.passage_name
        ))
        shownPassages.add(q.passage_id)
      }
    }
    
    // 주어진 글 블록 (순서/삽입용)
    if (q.givenBox) {
      blocks.push(createGivenBoxBlock(`givenbox-${q.id}`, q.givenBox))
    }
    
    // 문제 블록
    const choices = Array.isArray(q.choices) 
      ? q.choices 
      : typeof q.choices === 'string'
        ? JSON.parse(q.choices)
        : []
    
    blocks.push(createQuestionBlock(`question-${q.id}`, {
      instruction: q.instruction,
      body: includePassage ? undefined : q.body, // 지문 없으면 본문 포함
      choices,
      answer: includeAnswer ? q.answer : undefined,
      questionNumber: questionNumber++,
    }))
    
    // 해설 블록
    if (includeExplanation && q.explanation) {
      blocks.push({
        id: `explanation-${q.id}`,
        type: 'explanation',
        data: {
          explanationText: q.explanation,
        },
      })
    }
  }
  
  return blocks
}

