// ============================================
// 출력 설정 타입 (v2.0 - 단순화된 그리드+필드 구조)
// ============================================

/**
 * 뷰 타입 - 출력물 종류
 */
export type ViewType = 'student' | 'student_answer' | 'teacher' | 'answer_only'

/**
 * 선택지 마커 스타일
 */
export type ChoiceMarker = 'circled' | 'numbered' | 'parenthesis'
// circled: ①②③④⑤
// numbered: 1. 2. 3. 4. 5.
// parenthesis: (1) (2) (3) (4) (5)

/**
 * 선택지 레이아웃
 */
export type ChoiceLayout = 'vertical' | 'horizontal'

// ============================================
// 페이지 분할 설정
// ============================================

/**
 * 페이지 분할 모드
 * - flow: 자유 흐름 (페이지 경계 무시, 내용이 이어짐)
 * - smart: 탄력적 자동 구분 (단위별로 끊어서 가독성 확보)
 */
export type PageBreakMode = 'flow' | 'smart'

/**
 * 분할 단위
 * - passage: 지문 단위 (1지문 = 1블록)
 * - sentence: 문장 단위 (문장분석용)
 * - item: 항목 단위 (영작, 단어장 등)
 */
export type PageBreakUnit = 'passage' | 'sentence' | 'item'

/**
 * 페이지 분할 설정
 */
export interface PageBreakConfig {
  /** 분할 모드 */
  mode: PageBreakMode
  
  /** 분할 단위 (smart 모드에서 사용) */
  unit?: PageBreakUnit
  
  /** 
   * 최소 필요 공간 (%, 기본 50)
   * - 낮음(30): 공간 활용 우선 (빈틈없이 배치)
   * - 높음(70): 가독성 우선 (여유있게 배치)
   */
  minSpaceThreshold?: number
  
  /** 페이지/열당 최대 항목 수 (선택적 제한) */
  maxItemsPerPage?: number
  
  /** 외톨이 줄 방지 (기본 true) */
  avoidOrphans?: boolean
}

/**
 * 필드 스타일 (오버라이드용)
 */
export interface FieldStyle {
  fontSize?: number
  fontWeight?: 'normal' | 'bold'
  textAlign?: 'left' | 'center' | 'right'
  marginTop?: number
  marginBottom?: number
}

/**
 * 필드 배치 설정
 */
export interface FieldPlacement {
  key: string                    // 필드 키 (passage, question 등)
  label?: string                 // 표시 이름 (UI용)
  span?: 1 | 2                   // 열 차지 (기본 1, 2면 전체 너비)
  showIn?: ViewType[]            // 표시할 뷰 타입 (없으면 전체)
  style?: FieldStyle             // 스타일 오버라이드
}

/**
 * 용지 설정
 */
export interface PaperConfig {
  size: 'A4' | 'B5'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number     // mm
    bottom: number
    left: number
    right: number
  }
}

/**
 * 타이포그래피 설정
 */
export interface TypographyConfig {
  baseFontSize: number    // pt (기본 11)
  lineHeight: number      // 배수 (기본 1.5)
  minFontSize: number     // 최소 크기 (기본 8) - 동적 조절 하한선
}

/**
 * 출력 옵션
 */
export interface OutputOptions {
  pageNumbers: boolean
  pageNumberPosition?: 'bottom-center' | 'bottom-right'
  pageNumberFormat?: 'number' | 'number_of_total'  // '1' vs '1 / 5'
  choiceMarker: ChoiceMarker
  choiceLayout: ChoiceLayout
}

/**
 * 출력 설정 (메인 인터페이스)
 * 
 * 핵심 원칙: 그리드(열) + 필드(순서) + 페이지분할 = 모든 레이아웃 표현
 */
export interface OutputConfig {
  version: '2.0'
  
  // 1. 그리드 설정
  columns: 1 | 2                           // 열 개수
  columnRatio?: [number, number]           // 2열일 때 비율 (기본 [50, 50])
  columnGap?: number                       // 열 사이 간격 (mm, 기본 5)
  
  // 2. 필드 배치 (순서대로)
  fields: FieldPlacement[]
  
  // 3. 병렬/반복 모드 (특수 레이아웃용)
  parallel?: boolean                       // 쌍으로 묶음 (한줄해석용)
  repeat?: boolean                         // 단위별 반복 (문장분석용)
  
  // 4. 페이지 분할 (자유흐름 vs 자동구분)
  pageBreak?: PageBreakConfig
  
  // 5. 용지 설정
  paper: PaperConfig
  
  // 6. 타이포그래피
  typography: TypographyConfig
  
  // 7. 옵션
  options: OutputOptions
}

// ============================================
// 기본값 정의
// ============================================

export const DEFAULT_PAPER_CONFIG: PaperConfig = {
  size: 'A4',
  orientation: 'portrait',
  margins: { top: 15, bottom: 15, left: 15, right: 15 }
}

export const DEFAULT_TYPOGRAPHY_CONFIG: TypographyConfig = {
  baseFontSize: 11,
  lineHeight: 1.5,
  minFontSize: 8
}

export const DEFAULT_OUTPUT_OPTIONS: OutputOptions = {
  pageNumbers: true,
  pageNumberPosition: 'bottom-center',
  pageNumberFormat: 'number',
  choiceMarker: 'circled',
  choiceLayout: 'vertical'
}

export const DEFAULT_PAGE_BREAK_CONFIG: PageBreakConfig = {
  mode: 'smart',
  unit: 'passage',
  minSpaceThreshold: 50,
  avoidOrphans: true
}

export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  version: '2.0',
  columns: 1,
  fields: [
    { key: 'passage', label: '지문' },
    { key: 'question', label: '문제' },
    { key: 'choices', label: '선택지' },
    { key: 'answer', label: '정답', showIn: ['student_answer', 'teacher', 'answer_only'] },
    { key: 'explanation', label: '해설', showIn: ['teacher'] }
  ],
  pageBreak: DEFAULT_PAGE_BREAK_CONFIG,
  paper: DEFAULT_PAPER_CONFIG,
  typography: DEFAULT_TYPOGRAPHY_CONFIG,
  options: DEFAULT_OUTPUT_OPTIONS
}

// ============================================
// 레이아웃 즐겨찾기
// ============================================

/**
 * 레이아웃 즐겨찾기 (DB 저장용)
 */
export interface LayoutFavorite {
  id: string
  name: string
  description?: string
  config: OutputConfig
  created_at: string
  updated_at: string
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 기본 설정에 부분 설정을 병합
 */
export function mergeOutputConfig(
  partial: Partial<OutputConfig>
): OutputConfig {
  return {
    ...DEFAULT_OUTPUT_CONFIG,
    ...partial,
    pageBreak: {
      ...DEFAULT_PAGE_BREAK_CONFIG,
      ...partial.pageBreak
    },
    paper: {
      ...DEFAULT_PAPER_CONFIG,
      ...partial.paper,
      margins: {
        ...DEFAULT_PAPER_CONFIG.margins,
        ...partial.paper?.margins
      }
    },
    typography: {
      ...DEFAULT_TYPOGRAPHY_CONFIG,
      ...partial.typography
    },
    options: {
      ...DEFAULT_OUTPUT_OPTIONS,
      ...partial.options
    }
  }
}

/**
 * 뷰 타입에 따라 표시할 필드 필터링
 */
export function getFieldsForView(
  fields: FieldPlacement[],
  viewType: ViewType
): FieldPlacement[] {
  return fields.filter(field => {
    // showIn이 없으면 모든 뷰에서 표시
    if (!field.showIn || field.showIn.length === 0) {
      return true
    }
    return field.showIn.includes(viewType)
  })
}

/**
 * 선택지 마커 렌더링
 */
export function getChoiceMarker(
  index: number,
  style: ChoiceMarker
): string {
  const markers = {
    circled: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
    numbered: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
    parenthesis: ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)']
  }
  return markers[style][index] || `${index + 1}.`
}

// ============================================
// 뷰 타입 기본 필드 조합
// ============================================

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  student: '학생용 (문제지)',
  student_answer: '학생용 + 정답',
  teacher: '교사용 (해설지)',
  answer_only: '정답만'
}

export const VIEW_TYPE_DESCRIPTIONS: Record<ViewType, string> = {
  student: '지문 + 문제 + 선택지',
  student_answer: '지문 + 문제 + 선택지 + 정답',
  teacher: '지문 + 문제 + 선택지 + 정답 + 해설',
  answer_only: '정답만 출력'
}

// ============================================
// 페이지 분할 UI 라벨
// ============================================

export const PAGE_BREAK_MODE_LABELS: Record<PageBreakMode, string> = {
  flow: '자유 흐름',
  smart: '자동 구분 (Smart)'
}

export const PAGE_BREAK_MODE_DESCRIPTIONS: Record<PageBreakMode, string> = {
  flow: '내용이 끊기지 않고 이어서 출력됩니다',
  smart: '단위별로 구분하여 가독성을 높입니다'
}

export const PAGE_BREAK_UNIT_LABELS: Record<PageBreakUnit, string> = {
  passage: '지문 단위',
  sentence: '문장 단위',
  item: '항목 단위'
}

export const PAGE_BREAK_UNIT_DESCRIPTIONS: Record<PageBreakUnit, string> = {
  passage: '1지문+문제들을 하나의 블록으로',
  sentence: '문장분석 - 각 문장+분석을 하나의 블록으로',
  item: '영작/단어장 - 각 항목을 하나의 블록으로'
}

