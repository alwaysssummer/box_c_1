/**
 * 필드 필터링 유틸리티
 * 
 * ViewType에 따라 표시할 필드를 필터링합니다.
 */

import type { FieldPlacement, ViewType } from '@/types/output-config'

/**
 * 뷰 타입에 따라 표시할 필드만 필터링
 */
export function filterFieldsForView(
  fields: FieldPlacement[],
  viewType: ViewType
): FieldPlacement[] {
  return fields.filter(field => {
    // showIn이 없거나 빈 배열이면 모든 뷰에서 표시
    if (!field.showIn || field.showIn.length === 0) {
      return true
    }
    
    // showIn에 현재 viewType이 포함되어 있는지 확인
    return field.showIn.includes(viewType)
  })
}

/**
 * 필드가 특정 뷰에서 표시되는지 확인
 */
export function isFieldVisibleInView(
  field: FieldPlacement,
  viewType: ViewType
): boolean {
  if (!field.showIn || field.showIn.length === 0) {
    return true
  }
  return field.showIn.includes(viewType)
}

/**
 * 필드 키로 필드 찾기
 */
export function findFieldByKey(
  fields: FieldPlacement[],
  key: string
): FieldPlacement | undefined {
  return fields.find(f => f.key === key)
}

/**
 * 특정 키의 필드들만 추출
 */
export function extractFieldsByKeys(
  fields: FieldPlacement[],
  keys: string[]
): FieldPlacement[] {
  return keys
    .map(key => findFieldByKey(fields, key))
    .filter((f): f is FieldPlacement => f !== undefined)
}




