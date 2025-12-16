/**
 * 프레임 + 블록 기반 출력 시스템
 * 
 * 사용법:
 * import { Block, PrintLayout, DEFAULT_PRINT_STYLE } from '@/lib/print-system'
 */

// 타입 export
export type {
  // 블록
  BlockType,
  BlockData,
  Block,
  SentenceData,
  VocabularyItem,
  
  // 프레임
  FramePosition,
  FrameMerge,
  FrameCell,
  FrameConfig,
  
  // 레이아웃
  LayoutCategory,
  PassageLayout,
  SentenceLayout,
  PrintLayout,
  
  // 스타일
  PrintStyle,
  
  // 페이지/문서
  PrintPage,
  PrintDocument,
  
  // 오버플로우
  OverflowConfig,
  LayoutResult,
} from './types'

// 엔진 export
export {
  calculateLayout,
  createPassageBlock,
  createQuestionBlock,
  createGivenBoxBlock,
  createSentenceBlock,
  convertToBlocks,
  type LegacyQuestion,
} from './engine'

// 블록 감지 export
export {
  STANDARD_BLOCKS,
  detectBlocksForOneQ,
  detectBlocksForSlot,
  detectBlocksForSentence,
  detectAvailableBlocks,
  getBlockOptions,
  getPassageBlockOptions,
  getSentenceBlockOptions,
  type BlockInfo,
  type BlockOption,
  type QuestionTypeInfo,
} from './block-detector'

// 상수 export
export {
  // 기본 스타일
  DEFAULT_PRINT_STYLE,
  
  // 지문형 레이아웃
  DEFAULT_PASSAGE_LAYOUT,
  PASSAGE_LAYOUT_SINGLE,
  PASSAGE_LAYOUT_TOP,
  
  // 문장형 프레임
  FRAME_BILINGUAL,
  FRAME_CHUNKING,
  FRAME_STRUCTURE,
  FRAME_FULL,
  FRAME_QUAD,
  
  // 문장형 레이아웃
  SENTENCE_LAYOUT_BILINGUAL,
  SENTENCE_LAYOUT_CHUNKING,
  SENTENCE_LAYOUT_STRUCTURE,
  SENTENCE_LAYOUT_FULL,
  SENTENCE_LAYOUT_QUAD,
  
  // 오버플로우
  DEFAULT_OVERFLOW_CONFIG,
  
  // 페이지 크기
  A4_SIZE,
  A4_SIZE_PX,
  
  // 유틸리티
  CHOICE_MARKERS,
  getChoiceMarker,
} from './constants'

