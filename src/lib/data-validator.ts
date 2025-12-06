/**
 * 출제 2단계 시스템 - 1단계: 사전데이터 검증
 * 
 * 문제 유형 출제 전 필요한 사전데이터가 준비되어 있는지 검증
 */

import { SlotName, REQUIRED_SLOTS, QuestionGroup } from './slot-system'

// ============================================
// 타입 정의
// ============================================

/**
 * 개별 지문의 검증 결과
 */
export interface PassageValidationResult {
  passageId: string
  passageName: string
  unitName?: string
  textbookName?: string
  
  /** 검증 상태 */
  status: 'complete' | 'partial' | 'missing'
  
  /** 존재하는 슬롯 목록 */
  existingSlots: SlotName[]
  
  /** 누락된 슬롯 목록 */
  missingSlots: SlotName[]
  
  /** 필수 슬롯 중 누락된 것 */
  missingRequiredSlots: SlotName[]
  
  /** 선택 슬롯 중 누락된 것 */
  missingOptionalSlots: SlotName[]
  
  /** 슬롯별 상세 데이터 (있는 경우) */
  slotDetails?: Record<string, {
    dataTypeId: string
    dataTypeName: string
    generatedAt: string
  }>
}

/**
 * 전체 검증 결과
 */
export interface ValidationResult {
  /** 검증 대상 문제 유형 */
  questionTypeId: string
  questionTypeName: string
  questionGroup: QuestionGroup
  
  /** 필요한 슬롯 목록 */
  requiredSlots: SlotName[]
  
  /** 전체 통계 */
  summary: {
    total: number
    complete: number
    partial: number
    missing: number
  }
  
  /** 개별 지문 검증 결과 */
  passages: PassageValidationResult[]
  
  /** 출제 가능 여부 */
  canProceed: boolean
  
  /** 안내 메시지 */
  message: string
}

/**
 * 슬롯 데이터 소스 정보
 */
export interface SlotDataSource {
  slotName: SlotName
  dataTypeId: string
  dataTypeName: string
  isGenerated: boolean
}

// ============================================
// 검증 유틸리티 함수
// ============================================

/**
 * 지문의 슬롯 데이터 현황 분석
 */
export function analyzePassageSlots(
  slotData: Record<string, unknown>,
  requiredSlots: SlotName[],
  group: QuestionGroup
): {
  existingSlots: SlotName[]
  missingSlots: SlotName[]
  missingRequiredSlots: SlotName[]
  missingOptionalSlots: SlotName[]
  status: 'complete' | 'partial' | 'missing'
} {
  const groupRequiredSlots = REQUIRED_SLOTS[group] || []
  
  // 존재하는 슬롯
  const existingSlots = requiredSlots.filter(
    slot => slotData[slot] !== undefined && slotData[slot] !== null && slotData[slot] !== ''
  )
  
  // 누락된 슬롯
  const missingSlots = requiredSlots.filter(
    slot => !existingSlots.includes(slot)
  )
  
  // 필수 슬롯 중 누락된 것
  const missingRequiredSlots = missingSlots.filter(
    slot => groupRequiredSlots.includes(slot)
  )
  
  // 선택 슬롯 중 누락된 것
  const missingOptionalSlots = missingSlots.filter(
    slot => !groupRequiredSlots.includes(slot)
  )
  
  // 상태 결정
  let status: 'complete' | 'partial' | 'missing'
  if (missingRequiredSlots.length === 0 && missingSlots.length === 0) {
    status = 'complete'
  } else if (existingSlots.length === 0) {
    status = 'missing'
  } else {
    status = 'partial'
  }
  
  return {
    existingSlots,
    missingSlots,
    missingRequiredSlots,
    missingOptionalSlots,
    status,
  }
}

/**
 * 검증 결과 요약 생성
 */
export function createValidationSummary(
  passages: PassageValidationResult[]
): {
  total: number
  complete: number
  partial: number
  missing: number
} {
  return {
    total: passages.length,
    complete: passages.filter(p => p.status === 'complete').length,
    partial: passages.filter(p => p.status === 'partial').length,
    missing: passages.filter(p => p.status === 'missing').length,
  }
}

/**
 * 출제 가능 여부 및 메시지 생성
 */
export function evaluateValidation(
  summary: { total: number; complete: number; partial: number; missing: number }
): { canProceed: boolean; message: string } {
  if (summary.total === 0) {
    return {
      canProceed: false,
      message: '검증할 지문이 없습니다.',
    }
  }
  
  if (summary.complete === summary.total) {
    return {
      canProceed: true,
      message: `✅ 모든 지문(${summary.total}개)이 출제 준비 완료되었습니다.`,
    }
  }
  
  if (summary.complete > 0) {
    return {
      canProceed: true,
      message: `⚠️ ${summary.total}개 중 ${summary.complete}개 지문만 출제 가능합니다. ${summary.partial + summary.missing}개는 데이터 생성이 필요합니다.`,
    }
  }
  
  return {
    canProceed: false,
    message: `❌ 출제 가능한 지문이 없습니다. ${summary.total}개 지문 모두 데이터 생성이 필요합니다.`,
  }
}

// ============================================
// 누락 데이터 생성 관련
// ============================================

/**
 * 누락 슬롯 → 필요 데이터 유형 매핑
 */
export interface MissingDataInfo {
  passageId: string
  passageName: string
  missingSlots: SlotName[]
  suggestedDataTypes: {
    slotName: SlotName
    dataTypeId?: string
    dataTypeName?: string
    canGenerate: boolean
  }[]
}

/**
 * 누락 데이터 생성 요청
 */
export interface GenerateMissingRequest {
  passageIds: string[]
  dataTypeIds: string[]
  targetSlots: SlotName[]
}

/**
 * 누락 데이터 생성 결과
 */
export interface GenerateMissingResult {
  success: boolean
  generated: number
  failed: number
  errors: string[]
  details: {
    passageId: string
    dataTypeId: string
    status: 'success' | 'failed'
    error?: string
  }[]
}

// ============================================
// 클라이언트용 검증 함수
// ============================================

/**
 * 검증 API 호출 결과를 UI용 데이터로 변환
 */
export function formatValidationForUI(result: ValidationResult): {
  statusIcon: string
  statusColor: string
  progressPercent: number
  actionRequired: boolean
  actionText: string
} {
  const { summary, canProceed } = result
  
  const progressPercent = summary.total > 0 
    ? Math.round((summary.complete / summary.total) * 100) 
    : 0
  
  if (summary.complete === summary.total) {
    return {
      statusIcon: '✅',
      statusColor: 'green',
      progressPercent: 100,
      actionRequired: false,
      actionText: '출제 진행',
    }
  }
  
  if (canProceed) {
    return {
      statusIcon: '⚠️',
      statusColor: 'yellow',
      progressPercent,
      actionRequired: true,
      actionText: `${summary.partial + summary.missing}개 데이터 생성 필요`,
    }
  }
  
  return {
    statusIcon: '❌',
    statusColor: 'red',
    progressPercent,
    actionRequired: true,
    actionText: '데이터 생성 필요',
  }
}

/**
 * 지문별 상태 아이콘
 */
export function getPassageStatusIcon(status: 'complete' | 'partial' | 'missing'): string {
  switch (status) {
    case 'complete': return '✅'
    case 'partial': return '⚠️'
    case 'missing': return '❌'
    default: return '❓'
  }
}

/**
 * 지문별 상태 색상
 */
export function getPassageStatusColor(status: 'complete' | 'partial' | 'missing'): string {
  switch (status) {
    case 'complete': return 'text-green-600'
    case 'partial': return 'text-yellow-600'
    case 'missing': return 'text-red-600'
    default: return 'text-gray-600'
  }
}



