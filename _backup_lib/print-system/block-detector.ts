/**
 * 블록 감지 유틸리티
 * 
 * 원큐/슬롯 방식에서 사용 가능한 블록을 자동으로 감지합니다.
 */

import type { BlockType } from './types'

// ============================================
// 1. 블록 정보 타입
// ============================================

export interface BlockInfo {
  type: BlockType
  label: string
  description: string
  category: 'passage' | 'sentence' | 'common'
}

// ============================================
// 2. 표준 블록 정의
// ============================================

export const STANDARD_BLOCKS: Record<string, BlockInfo> = {
  // 지문형 블록
  passage: {
    type: 'passage',
    label: '지문',
    description: '영어 지문 본문',
    category: 'passage',
  },
  question: {
    type: 'question',
    label: '문제',
    description: '지시문 + 선택지',
    category: 'passage',
  },
  givenBox: {
    type: 'givenBox',
    label: '주어진 글',
    description: '순서/삽입 문제용 박스',
    category: 'passage',
  },
  answer: {
    type: 'answer',
    label: '정답',
    description: '문제 정답',
    category: 'common',
  },
  explanation: {
    type: 'explanation',
    label: '해설',
    description: '문제 해설',
    category: 'common',
  },
  
  // 문장형 블록
  original: {
    type: 'original',
    label: '원문',
    description: '영어 원문 문장',
    category: 'sentence',
  },
  translation: {
    type: 'translation',
    label: '해석',
    description: '한글 해석',
    category: 'sentence',
  },
  vocabulary: {
    type: 'vocabulary',
    label: '어휘',
    description: '단어/숙어 정리',
    category: 'sentence',
  },
  grammar: {
    type: 'grammar',
    label: '문법',
    description: '문법 포인트',
    category: 'sentence',
  },
  structure: {
    type: 'structure',
    label: '구문',
    description: '구문 분석',
    category: 'sentence',
  },
}

// ============================================
// 3. 원큐 방식 블록 감지
// ============================================

/**
 * 프롬프트 기반 문제 유형에서 블록 감지 (원큐)
 * 
 * 원큐 방식은 프롬프트가 직접 문제를 생성하므로,
 * 표준 출력 블록(지문, 문제, 정답 등)을 사용합니다.
 */
export function detectBlocksForOneQ(options: {
  hasPassage?: boolean      // 지문 포함 여부
  hasChoices?: boolean      // 선택지 포함 여부
  hasAnswer?: boolean       // 정답 포함 여부
  hasExplanation?: boolean  // 해설 포함 여부
  hasGivenBox?: boolean     // 주어진 글 포함 여부 (순서/삽입)
} = {}): BlockInfo[] {
  const {
    hasPassage = true,
    hasChoices = true,
    hasAnswer = true,
    hasExplanation = false,
    hasGivenBox = false,
  } = options

  const blocks: BlockInfo[] = []

  // 지문 (대부분의 문제에 포함)
  if (hasPassage) {
    blocks.push(STANDARD_BLOCKS.passage)
  }

  // 주어진 글 (순서/삽입 문제)
  if (hasGivenBox) {
    blocks.push(STANDARD_BLOCKS.givenBox)
  }

  // 문제 (지시문 + 선택지)
  if (hasChoices) {
    blocks.push(STANDARD_BLOCKS.question)
  }

  // 정답
  if (hasAnswer) {
    blocks.push(STANDARD_BLOCKS.answer)
  }

  // 해설
  if (hasExplanation) {
    blocks.push(STANDARD_BLOCKS.explanation)
  }

  return blocks
}

// ============================================
// 4. 슬롯 방식 블록 감지
// ============================================

/**
 * 슬롯 기반 문제 유형에서 블록 감지
 * 
 * 슬롯 방식은 required_slots에서 필요한 데이터를 정의하므로,
 * 슬롯 이름을 블록으로 매핑합니다.
 */
export function detectBlocksForSlot(requiredSlots: string[]): BlockInfo[] {
  const blocks: BlockInfo[] = []
  const addedTypes = new Set<string>()

  for (const slot of requiredSlots) {
    const blockType = mapSlotToBlock(slot)
    if (blockType && !addedTypes.has(blockType)) {
      addedTypes.add(blockType)
      if (STANDARD_BLOCKS[blockType]) {
        blocks.push(STANDARD_BLOCKS[blockType])
      }
    }
  }

  return blocks
}

/**
 * 슬롯 이름을 블록 타입으로 매핑
 */
function mapSlotToBlock(slot: string): string | null {
  const slotMapping: Record<string, string> = {
    // 지문형
    'passage': 'passage',
    'body': 'passage',
    'instruction': 'question',
    'question': 'question',
    'choices': 'question',
    'answer': 'answer',
    'explanation': 'explanation',
    'givenBox': 'givenBox',
    'given_box': 'givenBox',
    
    // 문장형
    'original': 'original',
    'translation': 'translation',
    'vocabulary': 'vocabulary',
    'grammar': 'grammar',
    'structure': 'structure',
    'analysis': 'structure',
  }

  return slotMapping[slot] || null
}

// ============================================
// 5. 문장형 블록 감지
// ============================================

/**
 * 문장형 문제에서 블록 감지
 */
export function detectBlocksForSentence(options: {
  hasOriginal?: boolean
  hasTranslation?: boolean
  hasVocabulary?: boolean
  hasGrammar?: boolean
  hasStructure?: boolean
} = {}): BlockInfo[] {
  const {
    hasOriginal = true,
    hasTranslation = true,
    hasVocabulary = false,
    hasGrammar = false,
    hasStructure = false,
  } = options

  const blocks: BlockInfo[] = []

  if (hasOriginal) blocks.push(STANDARD_BLOCKS.original)
  if (hasTranslation) blocks.push(STANDARD_BLOCKS.translation)
  if (hasVocabulary) blocks.push(STANDARD_BLOCKS.vocabulary)
  if (hasGrammar) blocks.push(STANDARD_BLOCKS.grammar)
  if (hasStructure) blocks.push(STANDARD_BLOCKS.structure)

  return blocks
}

// ============================================
// 6. 통합 블록 감지
// ============================================

export interface QuestionTypeInfo {
  mode: 'oneq' | 'slot'
  promptId?: string | null
  requiredSlots?: string[]
  category?: 'passage' | 'sentence'
}

/**
 * 문제 유형 정보에서 사용 가능한 블록 감지
 */
export function detectAvailableBlocks(info: QuestionTypeInfo): BlockInfo[] {
  const { mode, requiredSlots = [], category = 'passage' } = info

  if (mode === 'slot' && requiredSlots.length > 0) {
    return detectBlocksForSlot(requiredSlots)
  }

  // 원큐 또는 기본
  if (category === 'sentence') {
    return detectBlocksForSentence({
      hasOriginal: true,
      hasTranslation: true,
      hasVocabulary: true,
      hasGrammar: true,
    })
  }

  return detectBlocksForOneQ({
    hasPassage: true,
    hasChoices: true,
    hasAnswer: true,
    hasExplanation: true,
  })
}

// ============================================
// 7. 블록 옵션 생성 (드롭다운용)
// ============================================

export interface BlockOption {
  value: string
  label: string
  description?: string
}

/**
 * 드롭다운용 블록 옵션 생성
 */
export function getBlockOptions(blocks: BlockInfo[]): BlockOption[] {
  return [
    { value: '', label: '(비어있음)', description: '이 셀에 블록 없음' },
    ...blocks.map(block => ({
      value: block.type,
      label: block.label,
      description: block.description,
    })),
  ]
}

/**
 * 지문형 기본 블록 옵션
 */
export function getPassageBlockOptions(): BlockOption[] {
  return getBlockOptions(detectBlocksForOneQ({
    hasPassage: true,
    hasChoices: true,
    hasAnswer: true,
    hasExplanation: true,
    hasGivenBox: true,
  }))
}

/**
 * 문장형 기본 블록 옵션
 */
export function getSentenceBlockOptions(): BlockOption[] {
  return getBlockOptions(detectBlocksForSentence({
    hasOriginal: true,
    hasTranslation: true,
    hasVocabulary: true,
    hasGrammar: true,
    hasStructure: true,
  }))
}

