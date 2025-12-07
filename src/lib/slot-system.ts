/**
 * 출제 2단계 시스템 - 표준 슬롯명 시스템
 * 
 * 모든 데이터 유형과 문제 유형에서 사용하는 통일된 슬롯명 체계
 * 프롬프트 파싱 태그, 데이터 저장 키, 템플릿 슬롯이 모두 동일한 이름 사용
 */

// ============================================
// 표준 슬롯명 정의
// ============================================

/**
 * 전체 시스템에서 사용할 표준 슬롯명
 */
export const STANDARD_SLOTS = {
  // 공통 슬롯
  instruction: '지시문',
  body: '본문',
  choices: '선택지',
  answer: '정답',
  explanation: '해설',
  
  // 분석형 슬롯
  original: '원문',
  translation: '해석',
  vocabulary: '어휘',
  grammar: '문법',
  
  // 서술형/영작 슬롯
  hints: '힌트',
  blanks: '빈칸',
  arrangement: '배열정보',
  
  // 선택/수정형 슬롯
  options: '양자택일',
  underlines: '밑줄',
  
  // 단어장 슬롯
  word: '영단어',
  meaning: '뜻',
  example: '예문',
  definition: '영영풀이',
  
  // 실전형 추가 슬롯
  givenBox: '주어진 박스',
  modifiedBody: '변형본문',
} as const

export type SlotName = keyof typeof STANDARD_SLOTS

/**
 * 슬롯명 ↔ 한글명 매핑
 */
export function getSlotLabel(slotName: SlotName): string {
  return STANDARD_SLOTS[slotName] || slotName
}

/**
 * 한글명 → 슬롯명 역매핑
 */
export function getSlotNameFromLabel(label: string): SlotName | null {
  const entries = Object.entries(STANDARD_SLOTS)
  const found = entries.find(([, v]) => v === label)
  return found ? (found[0] as SlotName) : null
}

// ============================================
// 그룹별 슬롯 정의
// ============================================

/**
 * 문제 유형 그룹
 */
export type QuestionGroup = 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'

/**
 * 그룹별 사용 가능 슬롯
 */
export const SLOT_GROUPS: Record<QuestionGroup, SlotName[]> = {
  // 실전형 (5지선다)
  practical: ['instruction', 'body', 'givenBox', 'modifiedBody', 'choices', 'answer', 'explanation'],
  
  // 선택/수정형 (양자택일, 밑줄)
  selection: ['instruction', 'body', 'options', 'underlines', 'answer', 'explanation'],
  
  // 서술형/영작
  writing: ['instruction', 'original', 'translation', 'hints', 'blanks', 'arrangement', 'answer', 'explanation'],
  
  // 문장 분석
  analysis: ['original', 'translation', 'vocabulary', 'grammar'],
  
  // 단어장
  vocabulary: ['word', 'meaning', 'example', 'definition'],
}

/**
 * 그룹별 필수 슬롯
 */
export const REQUIRED_SLOTS: Record<QuestionGroup, SlotName[]> = {
  practical: ['instruction', 'body', 'choices', 'answer'],
  selection: ['instruction', 'body', 'answer'],
  writing: ['original', 'answer'],
  analysis: ['original', 'translation'],
  vocabulary: ['word', 'meaning'],
}

/**
 * 그룹별 선택적 슬롯
 */
export const OPTIONAL_SLOTS: Record<QuestionGroup, SlotName[]> = {
  practical: ['givenBox', 'modifiedBody', 'explanation'],
  selection: ['options', 'underlines', 'explanation'],
  writing: ['translation', 'hints', 'blanks', 'arrangement', 'explanation'],
  analysis: ['vocabulary', 'grammar'],
  vocabulary: ['example', 'definition'],
}

// ============================================
// 슬롯 유틸리티 함수
// ============================================

/**
 * 해당 그룹에서 슬롯 사용 가능 여부 확인
 */
export function isSlotAvailableInGroup(slotName: SlotName, group: QuestionGroup): boolean {
  return SLOT_GROUPS[group].includes(slotName)
}

/**
 * 해당 그룹에서 필수 슬롯인지 확인
 */
export function isRequiredSlot(slotName: SlotName, group: QuestionGroup): boolean {
  return REQUIRED_SLOTS[group].includes(slotName)
}

/**
 * 그룹의 모든 슬롯 정보 반환
 */
export function getGroupSlotInfo(group: QuestionGroup): {
  available: SlotName[]
  required: SlotName[]
  optional: SlotName[]
} {
  return {
    available: SLOT_GROUPS[group],
    required: REQUIRED_SLOTS[group],
    optional: OPTIONAL_SLOTS[group],
  }
}

/**
 * 슬롯 데이터 검증 - 필수 슬롯이 모두 있는지 확인
 */
export function validateSlotData(
  slotData: Record<string, unknown>,
  group: QuestionGroup
): { valid: boolean; missingSlots: SlotName[] } {
  const requiredSlots = REQUIRED_SLOTS[group]
  const missingSlots = requiredSlots.filter(slot => !slotData[slot])
  
  return {
    valid: missingSlots.length === 0,
    missingSlots,
  }
}

/**
 * 슬롯 데이터에서 특정 그룹에 필요한 슬롯만 추출
 */
export function extractSlotsForGroup(
  slotData: Record<string, unknown>,
  group: QuestionGroup
): Record<SlotName, unknown> {
  const availableSlots = SLOT_GROUPS[group]
  const result: Record<string, unknown> = {}
  
  for (const slot of availableSlots) {
    if (slotData[slot] !== undefined) {
      result[slot] = slotData[slot]
    }
  }
  
  return result as Record<SlotName, unknown>
}

// ============================================
// 슬롯 UI 헬퍼
// ============================================

/**
 * 슬롯 표시용 정보
 */
export interface SlotDisplayInfo {
  name: SlotName
  label: string
  required: boolean
  description?: string
}

/**
 * 그룹별 슬롯 표시 정보 생성
 */
export function getSlotDisplayInfoForGroup(group: QuestionGroup): SlotDisplayInfo[] {
  const slots = SLOT_GROUPS[group]
  const required = REQUIRED_SLOTS[group]
  
  return slots.map(slotName => ({
    name: slotName,
    label: getSlotLabel(slotName),
    required: required.includes(slotName),
  }))
}

/**
 * 슬롯 상태 타입
 */
export type SlotStatus = 'empty' | 'filled' | 'missing'

/**
 * 슬롯별 상태 계산
 */
export function getSlotStatuses(
  slotData: Record<string, unknown>,
  group: QuestionGroup
): Record<SlotName, SlotStatus> {
  const result: Record<string, SlotStatus> = {}
  const availableSlots = SLOT_GROUPS[group]
  const requiredSlots = REQUIRED_SLOTS[group]
  
  for (const slot of availableSlots) {
    if (slotData[slot]) {
      result[slot] = 'filled'
    } else if (requiredSlots.includes(slot)) {
      result[slot] = 'missing'
    } else {
      result[slot] = 'empty'
    }
  }
  
  return result as Record<SlotName, SlotStatus>
}

// ============================================
// 그룹 정보
// ============================================

/**
 * 그룹별 메타 정보
 */
export const GROUP_INFO: Record<QuestionGroup, {
  label: string
  description: string
  icon: string
}> = {
  practical: {
    label: '실전형',
    description: '5지선다 문제 (제목, 주제, 빈칸 등)',
    icon: '📝',
  },
  selection: {
    label: '선택/수정형',
    description: '양자택일, 어법/어휘 선택',
    icon: '✅',
  },
  writing: {
    label: '서술형/영작',
    description: '어구 배열, 빈칸 완성, 영작',
    icon: '✍️',
  },
  analysis: {
    label: '문장 분석',
    description: '원문, 해석, 어휘, 문법 분석',
    icon: '🔍',
  },
  vocabulary: {
    label: '단어장',
    description: '영단어, 뜻, 예문, 영영풀이',
    icon: '📚',
  },
}

/**
 * 모든 그룹 목록
 */
export const ALL_GROUPS: QuestionGroup[] = ['practical', 'selection', 'writing', 'analysis', 'vocabulary']

// ============================================
// 출력 포맷 템플릿 (AI 응답 형식 지시)
// ============================================

/**
 * 그룹별 AI 출력 포맷 템플릿
 * 프롬프트 끝에 자동 추가되어 일관된 파싱을 보장
 */
export const OUTPUT_FORMAT_TEMPLATES: Record<QuestionGroup, string> = {
  practical: `

[출력 형식]
반드시 아래 태그 형식으로 출력하세요:

[[instruction]]
문제 지시문 (예: "밑줄 친 부분의 의미와 가장 가까운 것은?")
[[/instruction]]

[[body]]
문제 본문 (지문에서 발췌하거나 변형한 내용)
[[/body]]

[[choices]]
① 첫 번째 선택지
② 두 번째 선택지
③ 세 번째 선택지
④ 네 번째 선택지
⑤ 다섯 번째 선택지
[[/choices]]

[[answer]]
정답 번호 (예: 3)
[[/answer]]

[[explanation]]
정답 해설 (왜 이 답이 맞는지 설명)
[[/explanation]]`,

  selection: `

[출력 형식]
반드시 아래 태그 형식으로 출력하세요:

[[instruction]]
문제 지시문 (예: "어법상 적절한 것을 고르시오.")
[[/instruction]]

[[body]]
문제 본문 (밑줄이나 괄호로 선택 부분 표시)
[[/body]]

[[options]]
(A) 첫 번째 옵션 / (B) 두 번째 옵션
[[/options]]

[[answer]]
정답 (예: A 또는 B)
[[/answer]]

[[explanation]]
정답 해설
[[/explanation]]`,

  writing: `

[출력 형식]
반드시 아래 태그 형식으로 출력하세요:

[[instruction]]
문제 지시문 (예: "주어진 단어를 배열하여 문장을 완성하시오.")
[[/instruction]]

[[original]]
원문 문장
[[/original]]

[[translation]]
한글 해석
[[/translation]]

[[hints]]
힌트 정보 (단어 배열, 첫 글자 등)
[[/hints]]

[[answer]]
모범 답안
[[/answer]]

[[explanation]]
해설
[[/explanation]]`,

  analysis: `

[출력 형식]
반드시 아래 태그 형식으로 출력하세요:

[[original]]
원문 문장
[[/original]]

[[translation]]
한글 해석
[[/translation]]

[[vocabulary]]
주요 어휘 목록 (단어: 뜻 형식)
[[/vocabulary]]

[[grammar]]
문법 설명 (구문 분석, 시제, 구조 등)
[[/grammar]]`,

  vocabulary: `

[출력 형식]
반드시 아래 태그 형식으로 출력하세요:

[[word]]
영단어
[[/word]]

[[meaning]]
한글 뜻
[[/meaning]]

[[example]]
예문
[[/example]]

[[definition]]
영영 풀이
[[/definition]]`,
}

/**
 * 프롬프트에 출력 포맷 자동 주입
 * @param content 원본 프롬프트 내용
 * @param group 문제 유형 그룹
 * @returns 출력 형식이 추가된 프롬프트
 */
export function injectOutputFormat(content: string, group: QuestionGroup): string {
  // 이미 출력 형식이 포함되어 있으면 추가하지 않음
  if (content.includes('[출력 형식]') || content.includes('[[instruction]]')) {
    return content
  }
  
  return content + OUTPUT_FORMAT_TEMPLATES[group]
}

/**
 * 프롬프트에서 출력 형식 부분 제거 (내용만 추출)
 */
export function extractPromptContent(content: string): string {
  const formatIndex = content.indexOf('[출력 형식]')
  if (formatIndex === -1) return content
  return content.substring(0, formatIndex).trim()
}

/**
 * 프롬프트가 출력 형식을 포함하고 있는지 확인
 */
export function hasOutputFormat(content: string): boolean {
  return content.includes('[출력 형식]') || content.includes('[[instruction]]') || content.includes('[[original]]')
}

// ============================================
// 그룹별 레이아웃 서브타입
// ============================================

/**
 * 레이아웃 서브타입 정의
 */
export type LayoutSubtype = 
  // 실전형 (practical)
  | 'standard'      // 표준형: 지시문 + 본문 + 선택지
  | 'with_box'      // 박스형: 주어진 글 + 본문 + 선택지 (순서/삽입)
  | 'blank'         // 빈칸형: 본문에 밑줄 포함
  // 선택형 (selection)
  | 'binary'        // 양자택일: (A)/(B) 선택
  | 'underline'     // 밑줄형: ①②③④⑤ 중 선택
  // 서술형 (writing)
  | 'arrange'       // 배열형: 어구 배열
  | 'partial'       // 부분영작: 조건 영작
  // 분석형 (analysis)
  | 'vertical'      // 세로형: 원문-해석 세로 배치
  | 'two_column'    // 2열형: 원문|해석 좌우 배치
  // 단어형 (vocabulary)
  | 'word_list'     // 단어목록
  | 'word_test'     // 단어테스트 (빈칸)

/**
 * 레이아웃 서브타입 정보
 */
export interface LayoutInfo {
  id: LayoutSubtype
  label: string
  description: string
  preview: string  // ASCII 미리보기
  defaultFor?: boolean  // 그룹 기본값 여부
}

/**
 * 그룹별 지원 레이아웃
 */
export const GROUP_LAYOUTS: Record<QuestionGroup, LayoutInfo[]> = {
  practical: [
    {
      id: 'standard',
      label: '표준형',
      description: '지시문 + 본문 + 5지선다',
      preview: '┌─────────┐\n│ 지시문  │\n├─────────┤\n│  본문   │\n├─────────┤\n│ ①②③④⑤│\n└─────────┘',
      defaultFor: true,
    },
    {
      id: 'with_box',
      label: '박스형',
      description: '주어진 글 박스 + 본문 + 선택지 (순서/삽입용)',
      preview: '┌─────────┐\n│ 지시문  │\n├─────────┤\n│▣주어진글│\n├─────────┤\n│  본문   │\n├─────────┤\n│ ①②③④⑤│\n└─────────┘',
    },
    {
      id: 'blank',
      label: '빈칸형',
      description: '본문에 밑줄/빈칸 포함 (빈칸추론용)',
      preview: '┌─────────┐\n│ 지시문  │\n├─────────┤\n│본문____│\n├─────────┤\n│ ①②③④⑤│\n└─────────┘',
    },
  ],
  selection: [
    {
      id: 'binary',
      label: '양자택일',
      description: '(A)/(B) 중 택일 (어법/어휘)',
      preview: '┌──────────────┐\n│①(A/B) ②(A/B)│\n│③(A/B) ④(A/B)│\n│⑤(A/B)       │\n└──────────────┘',
      defaultFor: true,
    },
    {
      id: 'underline',
      label: '밑줄형',
      description: '밑줄 친 부분 중 선택 (어법 틀린 것)',
      preview: '┌──────────────┐\n│본문에 ①밑줄 │\n│②밑줄 ③밑줄  │\n│④밑줄 ⑤밑줄  │\n└──────────────┘',
    },
  ],
  writing: [
    {
      id: 'arrange',
      label: '배열형',
      description: '어구를 순서대로 배열',
      preview: '┌─────────────┐\n│해석: ...    │\n├─────────────┤\n│①②③④⑤배열│\n└─────────────┘',
      defaultFor: true,
    },
    {
      id: 'partial',
      label: '부분영작',
      description: '조건에 맞게 영작',
      preview: '┌─────────────┐\n│조건: ...    │\n├─────────────┤\n│(     )영작  │\n└─────────────┘',
    },
  ],
  analysis: [
    {
      id: 'vertical',
      label: '세로형',
      description: '원문-해석 세로 배치',
      preview: '┌─────────┐\n│【원문】 │\n│English  │\n├─────────┤\n│【해석】 │\n│한글번역 │\n└─────────┘',
      defaultFor: true,
    },
    {
      id: 'two_column',
      label: '2열형',
      description: '원문|해석 좌우 배치',
      preview: '┌────┬────┐\n│원문│해석│\n│Eng │한글│\n└────┴────┘',
    },
  ],
  vocabulary: [
    {
      id: 'word_list',
      label: '단어목록',
      description: '단어-뜻 목록',
      preview: '┌─────┬─────┐\n│word │ 뜻  │\n│word │ 뜻  │\n└─────┴─────┘',
      defaultFor: true,
    },
    {
      id: 'word_test',
      label: '단어테스트',
      description: '빈칸 채우기 형식',
      preview: '┌─────┬─────┐\n│word │____│\n│____│ 뜻  │\n└─────┴─────┘',
    },
  ],
}

/**
 * 그룹의 기본 레이아웃 가져오기
 */
export function getDefaultLayout(group: QuestionGroup): LayoutSubtype {
  const layouts = GROUP_LAYOUTS[group]
  const defaultLayout = layouts.find(l => l.defaultFor)
  return defaultLayout?.id || layouts[0].id
}

/**
 * 레이아웃 정보 가져오기
 */
export function getLayoutInfo(group: QuestionGroup, layoutId: LayoutSubtype): LayoutInfo | undefined {
  return GROUP_LAYOUTS[group].find(l => l.id === layoutId)
}

/**
 * 그룹에서 해당 레이아웃 사용 가능 여부
 */
export function isLayoutAvailable(group: QuestionGroup, layoutId: LayoutSubtype): boolean {
  return GROUP_LAYOUTS[group].some(l => l.id === layoutId)
}
