/**
 * 데이터 검증 유틸리티
 * 슬롯 데이터의 유효성을 검증합니다.
 */

import { SlotName, QuestionGroup, SLOT_GROUPS, REQUIRED_SLOTS, OPTIONAL_SLOTS } from './slot-system'

// ============================================
// 타입 정의
// ============================================

export interface ValidationResult {
  questionTypeId: string
  questionTypeName: string
  questionGroup?: QuestionGroup
  requiredSlots: SlotName[]
  optionalSlots?: SlotName[]
  passageResults?: PassageValidationResult[]
  passages?: PassageValidationResult[]
  summary: ValidationSummary
  canProceed: boolean
  message: string
}

export interface PassageValidationResult {
  passageId: string
  passageName: string
  unitName?: string
  textbookName?: string
  status: 'ready' | 'partial' | 'empty'
  existingSlots: SlotName[]
  missingSlots: SlotName[]
  missingRequiredSlots: SlotName[]
  missingOptionalSlots: SlotName[]
  slotDetails?: Record<string, {
    dataTypeId: string
    dataTypeName: string
    generatedAt: string
  }>
}

export interface ValidationSummary {
  totalPassages: number
  readyPassages: number
  partialPassages: number
  emptyPassages: number
  slotCoverage: Record<SlotName, {
    count: number
    percentage: number
  }>
}

export interface SlotValidationResult {
  isValid: boolean
  passageId: string
  passageName: string
  errors: string[]
  warnings: string[]
  slots: Record<string, {
    filled: boolean
    value: unknown
  }>
}

export interface BatchValidationResult {
  total: number
  valid: number
  invalid: number
  results: SlotValidationResult[]
}

// ============================================
// 단일 지문 검증
// ============================================

/**
 * 단일 지문의 슬롯 데이터 검증 (레거시 호환용)
 */
export function validateSlotData(
  passageId: string,
  passageName: string,
  slotData: Record<string, unknown>,
  requiredSlots: string[]
): SlotValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const slots: Record<string, { filled: boolean; value: unknown }> = {}

  // 필수 슬롯 검증
  for (const slot of requiredSlots) {
    const value = slotData[slot]
    const filled = value !== undefined && value !== null && value !== ''
    
    slots[slot] = { filled, value }
    
    if (!filled) {
      errors.push(`필수 슬롯 '${slot}'이(가) 비어있습니다.`)
    }
  }

  // 모든 슬롯 기록
  for (const [key, value] of Object.entries(slotData)) {
    if (!slots[key]) {
      slots[key] = { filled: value !== undefined && value !== null && value !== '', value }
    }
  }

  return {
    isValid: errors.length === 0,
    passageId,
    passageName,
    errors,
    warnings,
    slots,
  }
}

/**
 * 여러 지문의 슬롯 데이터 일괄 검증
 */
export function batchValidateSlotData(
  passages: Array<{
    passageId: string
    passageName: string
    slotData: Record<string, unknown>
  }>,
  requiredSlots: string[]
): BatchValidationResult {
  const results = passages.map(p =>
    validateSlotData(p.passageId, p.passageName, p.slotData, requiredSlots)
  )

  return {
    total: results.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    results,
  }
}

// ============================================
// API용 슬롯 분석 함수
// ============================================

/**
 * 지문의 슬롯 상태 분석 (API 호환용)
 */
export function analyzePassageSlots(
  slotData: Record<string, unknown>,
  requiredSlots: SlotName[],
  questionGroup: QuestionGroup
): {
  status: 'ready' | 'partial' | 'empty'
  existingSlots: SlotName[]
  missingSlots: SlotName[]
  missingRequiredSlots: SlotName[]
  missingOptionalSlots: SlotName[]
} {
  const allSlots = SLOT_GROUPS[questionGroup] || []
  const optionalSlots = OPTIONAL_SLOTS[questionGroup] || []
  
  const existingSlots: SlotName[] = []
  const missingSlots: SlotName[] = []
  const missingRequiredSlots: SlotName[] = []
  const missingOptionalSlots: SlotName[] = []

  // 존재하는 슬롯 확인
  for (const slot of allSlots) {
    const value = slotData[slot]
    const filled = value !== undefined && value !== null && value !== ''
    
    if (filled) {
      existingSlots.push(slot)
    } else {
      missingSlots.push(slot)
      if (requiredSlots.includes(slot)) {
        missingRequiredSlots.push(slot)
      } else if (optionalSlots.includes(slot)) {
        missingOptionalSlots.push(slot)
      }
    }
  }

  // 상태 결정
  let status: 'ready' | 'partial' | 'empty' = 'empty'
  if (missingRequiredSlots.length === 0) {
    status = 'ready'
  } else if (existingSlots.length > 0) {
    status = 'partial'
  }

  return {
    status,
    existingSlots,
    missingSlots,
    missingRequiredSlots,
    missingOptionalSlots,
  }
}

/**
 * 검증 요약 생성 (API 호환용)
 */
export function createValidationSummary(
  passageResults: PassageValidationResult[]
): ValidationSummary {
  const slotCoverage: Record<string, { count: number; percentage: number }> = {}

  // 모든 기존 슬롯 수집
  const allExistingSlots: SlotName[] = []
  for (const result of passageResults) {
    for (const slot of result.existingSlots) {
      allExistingSlots.push(slot)
    }
  }

  // 슬롯별 커버리지 계산
  const uniqueSlots = [...new Set(allExistingSlots)]
  for (const slot of uniqueSlots) {
    const count = allExistingSlots.filter(s => s === slot).length
    slotCoverage[slot] = {
      count,
      percentage: passageResults.length > 0 ? (count / passageResults.length) * 100 : 0,
    }
  }

  const readyPassages = passageResults.filter(r => r.status === 'ready').length
  const partialPassages = passageResults.filter(r => r.status === 'partial').length
  const emptyPassages = passageResults.filter(r => r.status === 'empty').length

  return {
    totalPassages: passageResults.length,
    readyPassages,
    partialPassages,
    emptyPassages,
    slotCoverage: slotCoverage as Record<SlotName, { count: number; percentage: number }>,
  }
}

/**
 * 검증 결과 평가 (API 호환용)
 */
export function evaluateValidation(
  summary: ValidationSummary
): {
  canProceed: boolean
  message: string
} {
  if (summary.readyPassages === 0) {
    return {
      canProceed: false,
      message: '사용 가능한 지문이 없습니다. 먼저 데이터를 생성하세요.',
    }
  }

  if (summary.partialPassages > 0 || summary.emptyPassages > 0) {
    return {
      canProceed: true,
      message: `${summary.readyPassages}개 지문만 사용 가능합니다. (${summary.partialPassages + summary.emptyPassages}개 준비 안됨)`,
    }
  }

  return {
    canProceed: true,
    message: '모든 지문이 준비되었습니다.',
  }
}
