/**
 * 프레임 + 블록 기반 출력 시스템 - 상수 및 기본값
 */

import type {
  PrintStyle,
  PassageLayout,
  SentenceLayout,
  FrameConfig,
  OverflowConfig,
} from './types'

// ============================================
// 1. 기본 스타일
// ============================================

/**
 * 기본 출력 스타일
 */
export const DEFAULT_PRINT_STYLE: PrintStyle = {
  fontSize: 10,
  lineHeight: 1.6,
  padding: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
  },
  questionSpacing: 16,
  columnGap: 24,
  choiceMarker: 'circle',
  choiceLayout: 'vertical',
}

// ============================================
// 2. 지문형 레이아웃 프리셋
// ============================================

/**
 * 지문형 기본 레이아웃 (2단, 지문 좌측)
 */
export const DEFAULT_PASSAGE_LAYOUT: PassageLayout = {
  category: 'passage',
  columns: 2,
  passagePosition: 'left',
  showPassageOnce: true,
}

/**
 * 지문형 1단 레이아웃
 */
export const PASSAGE_LAYOUT_SINGLE: PassageLayout = {
  category: 'passage',
  columns: 1,
  passagePosition: 'top',
  showPassageOnce: true,
}

/**
 * 지문형 2단 레이아웃 (지문 상단)
 */
export const PASSAGE_LAYOUT_TOP: PassageLayout = {
  category: 'passage',
  columns: 2,
  passagePosition: 'top',
  showPassageOnce: true,
}

// ============================================
// 3. 문장형 프레임 프리셋
// ============================================

/**
 * 영한 대조 (L1) - 좌우 2분할
 * ┌───────────┬───────────┐
 * │  원문     │  해석     │
 * │  (A+C)    │  (B+D)    │
 * └───────────┴───────────┘
 */
export const FRAME_BILINGUAL: FrameConfig = {
  merge: { left: true, right: true },
  cells: {
    A: 'original',
    B: 'translation',
    C: null,
    D: null,
  },
}

/**
 * 끊어읽기 (L2) - 상하 2분할 + 하단 좌우
 * ┌───────────────────────┐
 * │      원문 (A+B)       │
 * ├───────────┬───────────┤
 * │  해석 (C) │ 어휘 (D)  │
 * └───────────┴───────────┘
 */
export const FRAME_CHUNKING: FrameConfig = {
  merge: { top: true },
  cells: {
    A: 'original',
    B: null,
    C: 'translation',
    D: 'vocabulary',
  },
}

/**
 * 구조 분석 (L3) - 상하 2분할 + 하단 좌우
 * ┌───────────────────────┐
 * │      원문 (A+B)       │
 * ├───────────┬───────────┤
 * │ 구문 (C)  │ 문법 (D)  │
 * └───────────┴───────────┘
 */
export const FRAME_STRUCTURE: FrameConfig = {
  merge: { top: true },
  cells: {
    A: 'original',
    B: null,
    C: 'structure',
    D: 'grammar',
  },
}

/**
 * 종합 분석 (L4) - 전체 1열
 * ┌───────────────────────┐
 * │                       │
 * │  전체 (A+B+C+D)       │
 * │                       │
 * └───────────────────────┘
 */
export const FRAME_FULL: FrameConfig = {
  merge: { top: true, bottom: true, left: true, right: true },
  cells: {
    A: 'original',
    B: null,
    C: null,
    D: null,
  },
}

/**
 * 4분할 기본 (2×2)
 * ┌───────────┬───────────┐
 * │ 원문 (A)  │ 어휘 (B)  │
 * ├───────────┼───────────┤
 * │ 해석 (C)  │ 문법 (D)  │
 * └───────────┴───────────┘
 */
export const FRAME_QUAD: FrameConfig = {
  cells: {
    A: 'original',
    B: 'vocabulary',
    C: 'translation',
    D: 'grammar',
  },
}

// ============================================
// 4. 문장형 레이아웃 프리셋
// ============================================

/**
 * 영한 대조 레이아웃 (L1)
 */
export const SENTENCE_LAYOUT_BILINGUAL: SentenceLayout = {
  category: 'sentence',
  frame: FRAME_BILINGUAL,
  showSentenceNumber: true,
}

/**
 * 끊어읽기 레이아웃 (L2)
 */
export const SENTENCE_LAYOUT_CHUNKING: SentenceLayout = {
  category: 'sentence',
  frame: FRAME_CHUNKING,
  showSentenceNumber: true,
}

/**
 * 구조 분석 레이아웃 (L3)
 */
export const SENTENCE_LAYOUT_STRUCTURE: SentenceLayout = {
  category: 'sentence',
  frame: FRAME_STRUCTURE,
  showSentenceNumber: true,
}

/**
 * 종합 분석 레이아웃 (L4)
 */
export const SENTENCE_LAYOUT_FULL: SentenceLayout = {
  category: 'sentence',
  frame: FRAME_FULL,
  showSentenceNumber: true,
}

/**
 * 4분할 레이아웃
 */
export const SENTENCE_LAYOUT_QUAD: SentenceLayout = {
  category: 'sentence',
  frame: FRAME_QUAD,
  showSentenceNumber: true,
}

// ============================================
// 5. 오버플로우 설정
// ============================================

/**
 * 기본 오버플로우 설정
 */
export const DEFAULT_OVERFLOW_CONFIG: OverflowConfig = {
  autoScale: true,
  minScale: 0.85,
  allowPageBreak: true,
}

// ============================================
// 6. 페이지 크기
// ============================================

/**
 * A4 페이지 크기 (mm)
 */
export const A4_SIZE = {
  width: 210,
  height: 297,
}

/**
 * A4 페이지 크기 (px, 96dpi 기준)
 */
export const A4_SIZE_PX = {
  width: 794,   // 210mm * 96dpi / 25.4
  height: 1123, // 297mm * 96dpi / 25.4
}

// ============================================
// 7. 선택지 마커
// ============================================

export const CHOICE_MARKERS = {
  circle: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
  number: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
  alphabet: ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'I.', 'J.'],
} as const

/**
 * 선택지 마커 가져오기
 */
export function getChoiceMarker(
  index: number,
  type: 'circle' | 'number' | 'alphabet' = 'circle'
): string {
  const markers = CHOICE_MARKERS[type]
  return markers[index] || `${index + 1}.`
}

