/**
 * 프레임 + 블록 기반 출력 시스템 - 타입 정의
 * 
 * 핵심 개념:
 * - 블록 (Block): 렌더링 단위 (데이터 덩어리)
 * - 프레임 (Frame): 배치 공간 (2×2 그리드 기반)
 * - 페이지 (Page): A4 출력 단위
 */

// ============================================
// 1. 블록 타입 (Block)
// ============================================

/**
 * 블록 타입 - 렌더링의 최소 단위
 */
export type BlockType = 
  // 지문형 (Passage)
  | 'passage'       // 지문
  | 'question'      // 문제 (지시문 + 선택지)
  | 'givenBox'      // 주어진 글 (순서/삽입용)
  | 'answer'        // 정답
  | 'explanation'   // 해설
  // 문장형 (Sentence)
  | 'original'      // 원문
  | 'translation'   // 해석
  | 'vocabulary'    // 어휘
  | 'grammar'       // 문법
  | 'structure'     // 구문 분석

/**
 * 블록 데이터 - 각 블록 타입별 데이터 구조
 */
export interface BlockData {
  // 공통
  id?: string
  
  // 지문/문제용
  instruction?: string       // 지시문
  body?: string              // 본문 (지문 또는 문제 본문)
  choices?: string[]         // 선택지
  answer?: string | number   // 정답
  explanationText?: string   // 해설 텍스트
  
  // 박스형용 (순서/삽입)
  givenBoxContent?: string   // 주어진 글 내용
  
  // 문장형용
  sentences?: SentenceData[] // 문장 목록
  
  // 메타 정보
  questionNumber?: number    // 문제 번호
  passageId?: string         // 지문 ID
  passageName?: string       // 지문 이름
}

/**
 * 문장 데이터 (문장형 블록용)
 */
export interface SentenceData {
  sentenceNo: number         // 문장 번호
  original?: string          // 원문
  translation?: string       // 해석
  vocabulary?: VocabularyItem[] // 어휘
  grammar?: string           // 문법 포인트
  structure?: string         // 구문 분석
}

/**
 * 어휘 아이템
 */
export interface VocabularyItem {
  word: string
  meaning: string
}

/**
 * 블록 - 렌더링 단위
 */
export interface Block {
  id: string
  type: BlockType
  data: BlockData
  /** 블록 배치 위치 (2단 레이아웃용) */
  position?: 'left' | 'right' | 'full'
}

// ============================================
// 2. 프레임 타입 (Frame)
// ============================================

/**
 * 프레임 위치 (2×2 그리드)
 * 
 * ┌───┬───┐
 * │ A │ B │
 * ├───┼───┤
 * │ C │ D │
 * └───┴───┘
 */
export type FramePosition = 'A' | 'B' | 'C' | 'D'

/**
 * 프레임 셀 병합 설정
 */
export interface FrameMerge {
  top?: boolean     // A+B 병합 (상단 전체)
  bottom?: boolean  // C+D 병합 (하단 전체)
  left?: boolean    // A+C 병합 (좌측 전체)
  right?: boolean   // B+D 병합 (우측 전체)
}

/**
 * 프레임 셀 설정
 */
export interface FrameCell {
  position: FramePosition
  blockType: BlockType | null
}

/**
 * 프레임 설정 (2×2 그리드)
 */
export interface FrameConfig {
  // 셀 병합 설정
  merge?: FrameMerge
  
  // 각 셀에 배치할 블록 타입
  cells: {
    A?: BlockType | null
    B?: BlockType | null
    C?: BlockType | null
    D?: BlockType | null
  }
}

// ============================================
// 3. 레이아웃 타입 (Layout)
// ============================================

/**
 * 레이아웃 카테고리
 */
export type LayoutCategory = 'passage' | 'sentence'

/**
 * 지문형 레이아웃 설정
 */
export interface PassageLayout {
  category: 'passage'
  
  // 열 수 (1단 또는 2단)
  columns: 1 | 2
  
  // 지문 위치
  passagePosition: 'top' | 'left'
  
  // 1지문 N문제 시 지문 1회만 표시
  showPassageOnce: boolean
}

/**
 * 문장형 레이아웃 설정
 */
export interface SentenceLayout {
  category: 'sentence'
  
  // 프레임 설정 (2×2 그리드)
  frame: FrameConfig
  
  // 문장 번호 표시
  showSentenceNumber: boolean
}

/**
 * 통합 레이아웃
 */
export type PrintLayout = PassageLayout | SentenceLayout

// ============================================
// 4. 스타일 타입 (Style)
// ============================================

/**
 * 출력 스타일 설정
 */
export interface PrintStyle {
  // 글꼴
  fontSize: number           // 기본 글꼴 크기 (pt)
  lineHeight: number         // 줄간격 (배수)
  
  // 여백 (mm)
  padding: {
    top: number
    bottom: number
    left: number
    right: number
  }
  
  // 간격
  questionSpacing: number    // 문제 간격 (px)
  columnGap: number          // 열 간격 (px)
  
  // 선택지
  choiceMarker: 'circle' | 'number' | 'alphabet'
  choiceLayout: 'vertical' | 'horizontal'
}

// ============================================
// 5. 페이지/문서 타입
// ============================================

/**
 * 출력 페이지
 */
export interface PrintPage {
  pageNumber: number
  blocks: Block[]
  scale: number  // 축소율 (1.0 = 100%, 0.9 = 90%)
}

/**
 * 출력 문서
 */
export interface PrintDocument {
  pages: PrintPage[]
  style: PrintStyle
  layout: PrintLayout
}

// ============================================
// 6. 오버플로우 처리
// ============================================

/**
 * 오버플로우 설정
 */
export interface OverflowConfig {
  autoScale: boolean      // 자동 축소 활성화
  minScale: number        // 최소 축소율 (예: 0.85)
  allowPageBreak: boolean // 페이지 분할 허용
}

/**
 * 레이아웃 계산 결과
 */
export interface LayoutResult {
  pages: PrintPage[]
  overflow: boolean       // 오버플로우 발생 여부
  appliedScale: number    // 적용된 축소율
}

