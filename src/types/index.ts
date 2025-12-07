// 모든 타입 re-export
export * from './database'

// 슬롯 시스템 타입 re-export
export type {
  SlotName,
  QuestionGroup,
  SlotDisplayInfo,
  SlotStatus,
  LayoutSubtype,
  LayoutInfo,
} from '../lib/slot-system'

export {
  STANDARD_SLOTS,
  SLOT_GROUPS,
  REQUIRED_SLOTS,
  OPTIONAL_SLOTS,
  GROUP_INFO,
  ALL_GROUPS,
  GROUP_LAYOUTS,
  getSlotLabel,
  getSlotNameFromLabel,
  isSlotAvailableInGroup,
  isRequiredSlot,
  getGroupSlotInfo,
  extractSlotsForGroup,
  getSlotDisplayInfoForGroup,
  getSlotStatuses,
  getDefaultLayout,
  getLayoutInfo,
  isLayoutAvailable,
} from '../lib/slot-system'

// 프롬프트 파싱 타입 re-export
export type {
  ParsedQuestionResult,
} from '../lib/prompt-parser'

export {
  parsePromptResult,
  parseChoices,
  parseAnswer,
  parseVocabulary,
  parsePracticalQuestion,
  parseAnalysisData,
} from '../lib/prompt-parser'

// 데이터 검증 타입 re-export
export type {
  PassageValidationResult,
  ValidationResult,
  ValidationSummary,
  SlotValidationResult,
  BatchValidationResult,
} from '../lib/data-validator'

export {
  analyzePassageSlots,
  createValidationSummary,
  evaluateValidation,
  validateSlotData,
  batchValidateSlotData,
} from '../lib/data-validator'

// 슬롯 매퍼 타입 re-export
export type {
  MappedQuestion,
  BatchMappingResult,
  QuestionTemplate,
  ChoiceMarker,
} from '../lib/slot-mapper'

export {
  mapDataToTemplate,
  batchMapDataToTemplate,
  getChoiceMarker,
  formatChoices,
  renderQuestionAsText,
  renderAnalysisAsText,
} from '../lib/slot-mapper'

// UI 관련 타입
export type ActiveTab = '회원관리' | '교재관리' | '설정'
export type SettingMenu = '프롬프트' | '데이터 유형' | '문제 유형' | '시스템 설정'

// 프롬프트 카테고리
export const PROMPT_CATEGORIES = [
  { value: 'extraction', label: '추출' },
  { value: 'generation', label: '생성' },
  { value: 'analysis', label: '분석' },
  { value: 'transformation', label: '변환' },
  { value: 'general', label: '일반' },
] as const

// 프롬프트 상태
export const PROMPT_STATUS = [
  { value: 'draft', label: '초안', color: 'bg-gray-100 text-gray-700' },
  { value: 'testing', label: '테스트 중', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'confirmed', label: '확정', color: 'bg-green-100 text-green-700' },
] as const

// AI 모델 정의 (비용 포함)
export const AI_MODELS = {
  'gpt-4o': { 
    provider: 'openai', 
    name: 'GPT-4o', 
    description: '최신 고성능',
    tier: 'premium',
    costPer1kTokens: { input: 0.005, output: 0.015 },
    accuracy: 99
  },
  'gpt-4o-mini': { 
    provider: 'openai', 
    name: 'GPT-4o Mini', 
    description: '빠르고 저렴',
    tier: 'mini',
    costPer1kTokens: { input: 0.00015, output: 0.0006 },
    accuracy: 97
  },
  'claude-3-5-sonnet-20241022': { 
    provider: 'anthropic', 
    name: 'Claude 3.5 Sonnet', 
    description: '고성능',
    tier: 'premium',
    costPer1kTokens: { input: 0.003, output: 0.015 },
    accuracy: 99
  },
  'claude-3-haiku-20240307': { 
    provider: 'anthropic', 
    name: 'Claude 3 Haiku', 
    description: '빠름',
    tier: 'mini',
    costPer1kTokens: { input: 0.00025, output: 0.00125 },
    accuracy: 95
  },
  'gemini-1.5-pro': { 
    provider: 'google', 
    name: 'Gemini 1.5 Pro', 
    description: '긴 컨텍스트',
    tier: 'standard',
    costPer1kTokens: { input: 0.00125, output: 0.005 },
    accuracy: 98
  },
  'gemini-2.0-flash': { 
    provider: 'google', 
    name: '⚡ Gemini 2.0 Flash (추천)', 
    description: '빠르고 저렴한 추천 모델',
    tier: 'mini',
    costPer1kTokens: { input: 0.000075, output: 0.0003 },
    accuracy: 96
  },
  'gemini-2.5-flash': { 
    provider: 'google', 
    name: '🚀 Gemini 2.5 Flash (최신)', 
    description: '최신 고속 모델',
    tier: 'mini',
    costPer1kTokens: { input: 0.000075, output: 0.0003 },
    accuracy: 97
  },
} as const

export type ModelId = keyof typeof AI_MODELS
export type ModelTier = 'mini' | 'standard' | 'premium'

// 난이도별 추천 모델
export const DIFFICULTY_MODEL_MAP: Record<string, ModelId> = {
  simple: 'gemini-2.0-flash',
  medium: 'gpt-4o-mini',
  complex: 'gpt-4o',
}

// 난이도 옵션
export const DIFFICULTY_OPTIONS = [
  { value: 'simple', label: '단순', description: '어휘 추출, 품사 태깅 등', recommendedModel: 'gemini-2.0-flash' },
  { value: 'medium', label: '중간', description: '주제문 찾기, 요약 등', recommendedModel: 'gpt-4o-mini' },
  { value: 'complex', label: '복잡', description: '논리 구조, 오답 생성 등', recommendedModel: 'gpt-4o' },
] as const

export type Difficulty = 'simple' | 'medium' | 'complex'

// AI 에러 응답 정보
export interface AIErrorResponse {
  type: string
  message: string
  solution: string
  severity?: string
  canRetry: boolean
  alternativeModel?: string | null
}

// 프롬프트 테스트 결과
export interface PromptTestResult {
  success: boolean
  result?: string
  error?: string
  aiError?: AIErrorResponse  // 상세 에러 정보
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  responseTime: number
  model: string
}

// 데이터 유형 폼
export interface DataTypeFormData {
  id: string | null
  name: string
  target: 'passage' | 'sentence'
  prompt: string
  variables: string[]
  outputSchema: string
  sampleResult: string
  hasAnswer: boolean
  answerFormat: string
  hasDependency: boolean
  dependsOn: string[]
}

// 문제 유형 폼
export interface QuestionTypeFormData {
  id: string | null
  name: string
  instruction: string
  dataTypeList: QuestionTypeDataItem[]
  choiceLayout: 'vertical' | 'horizontal' | 'grid2'
  choiceMarker: 'circle' | 'number' | 'alpha' | 'paren'
}

export interface QuestionTypeDataItem {
  id: string
  dataTypeId: string
  dataTypeName: string
  role: 'body' | 'choices' | 'answer' | 'explanation'
}

// 정답 형식 옵션
export const ANSWER_FORMATS = [
  { value: '5choice', label: '5지선다' },
  { value: 'truefalse', label: '양자택일 (T/F)' },
  { value: 'blank', label: '빈칸 완성형' },
  { value: 'correction', label: '지문 수정형' },
  { value: 'writing', label: '영작형' },
  { value: 'ordering', label: '순서 배열형' },
  { value: 'matching', label: '매칭형' },
  { value: 'descriptive', label: '서술형' },
] as const

// 선택지 레이아웃 옵션
export const CHOICE_LAYOUTS = [
  { value: 'vertical', label: '세로형' },
  { value: 'horizontal', label: '가로형' },
  { value: 'grid2', label: '2열 그리드' },
] as const

// 선택지 마커 옵션
export const CHOICE_MARKERS = [
  { value: 'circle', label: '① ② ③ ④ ⑤' },
  { value: 'number', label: '1. 2. 3. 4. 5.' },
  { value: 'alpha', label: 'A. B. C. D. E.' },
  { value: 'paren', label: '(1) (2) (3) (4) (5)' },
] as const

// 트리 노드 색상
export const NODE_COLORS: Record<string, string> = {
  group: 'text-blue-600',
  textbook: 'text-green-600',
  unit: 'text-orange-500',
  passage: 'text-purple-600',
  sentence: 'text-gray-600',
}

// 트리 노드 라벨
export const NODE_LABELS: Record<string, string> = {
  group: '그룹',
  textbook: '교재',
  unit: '단원',
  passage: '지문',
  sentence: '문장',
}

// 문장 분리 관련 타입
export interface SentenceSplitResult {
  sentences: ParsedSentence[]
  confidence: number
  method: 'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel'
  model?: ModelId
  warnings?: string[]
  koreanIssues?: KoreanIssue[]  // 한글 품질 문제 (관리자 알림용)
  aiError?: AIErrorResponse     // AI 에러 상세 정보
}

// 한글 번역 품질 문제 (관리자 알림용)
export interface KoreanIssue {
  type: 'missing' | 'incomplete' | 'mismatch' | 'quality' | 'modified'
  pairNo?: number
  description: string
  severity: 'low' | 'medium' | 'high'
  needsReview: boolean
}

// 문장 쌍 (병렬 추출 결과)
export interface SentencePair {
  no: number
  english: string           // 원문 그대로 (절대 수정 불가)
  korean: string            // 해석 그대로 (절대 수정 불가)
  confidence: number
  qualityScore?: number     // 번역 품질 점수 (0-100)
}

export interface ParsedSentence {
  no: number
  content: string
  koreanTranslation?: string
  wordCount: number
  confidence: number
  issues?: string[]
}

export interface SentenceSplitOptions {
  model?: ModelId
  useAI?: boolean
  verifyWithAI?: boolean
  includeKorean?: boolean
}

// 번역 검증 관련 타입
export interface TranslationStatus {
  hasTranslation: boolean
  sentenceCount: { english: number; korean: number }
  alignment: 'perfect' | 'mismatch' | 'missing'
  quality: 'good' | 'suspicious' | 'unknown'
  needsAI: boolean
  suspicionLevel: number
  signals: string[]
}

// 문장 분리 모델 선택 옵션
export const SENTENCE_SPLIT_MODELS = [
  { 
    value: 'gemini-2.0-flash', 
    label: '⚡ Gemini 2.0 Flash (추천)', 
    description: '속도: 매우 빠름 | 정확도: 96% | 비용: 최저',
    cost: 0.000075
  },
  { 
    value: 'gemini-2.5-flash', 
    label: '🚀 Gemini 2.5 Flash (최신)', 
    description: '속도: 매우 빠름 | 정확도: 97% | 비용: 최저',
    cost: 0.000075
  },
  { 
    value: 'gpt-4o-mini', 
    label: '🔹 GPT-4o Mini', 
    description: '속도: 빠름 | 정확도: 97% | 비용: 저렴',
    cost: 0.00015
  },
  { 
    value: 'claude-3-haiku-20240307', 
    label: '🔸 Claude Haiku', 
    description: '속도: 빠름 | 정확도: 95% | 비용: 저렴',
    cost: 0.00025
  },
  { 
    value: 'gpt-4o', 
    label: '💎 GPT-4o', 
    description: '속도: 느림 | 정확도: 99% | 비용: 높음',
    cost: 0.005
  },
] as const

