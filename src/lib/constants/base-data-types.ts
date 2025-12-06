/**
 * 기본 데이터 유형 정의
 * 
 * 이 데이터 유형들은 문장 분리 시 자동으로 생성되며,
 * AI 호출 없이 바로 사용할 수 있는 기본 데이터입니다.
 */

export interface BaseDataType {
  id: string
  name: string
  description: string
  target: 'passage' | 'sentence'
  source: string
  aggregate?: boolean // 문장 데이터를 합쳐서 사용할지 여부
}

// 고정 UUID (변경하지 마세요 - 데이터베이스와 동기화됨)
export const BASE_DATA_TYPE_IDS = {
  PASSAGE_ENGLISH: '00000000-0000-0000-0000-000000000001',
  PASSAGE_KOREAN: '00000000-0000-0000-0000-000000000002',
  SENTENCE_ENGLISH: '00000000-0000-0000-0000-000000000003',
  SENTENCE_KOREAN: '00000000-0000-0000-0000-000000000004',
} as const

export const BASE_DATA_TYPES: Record<string, BaseDataType> = {
  PASSAGE_ENGLISH: {
    id: BASE_DATA_TYPE_IDS.PASSAGE_ENGLISH,
    name: '영어지문',
    description: '지문 전체 영어 원문',
    target: 'passage',
    source: 'passages.content',
  },
  PASSAGE_KOREAN: {
    id: BASE_DATA_TYPE_IDS.PASSAGE_KOREAN,
    name: '한글해석',
    description: '문장별 한글 번역을 합친 전체 해석',
    target: 'passage',
    source: 'sentences.korean_translation',
    aggregate: true,
  },
  SENTENCE_ENGLISH: {
    id: BASE_DATA_TYPE_IDS.SENTENCE_ENGLISH,
    name: '영어한줄',
    description: '문장별 영어 원문',
    target: 'sentence',
    source: 'sentences.content',
  },
  SENTENCE_KOREAN: {
    id: BASE_DATA_TYPE_IDS.SENTENCE_KOREAN,
    name: '한글한줄',
    description: '문장별 한글 번역',
    target: 'sentence',
    source: 'sentences.korean_translation',
  },
} as const

export type BaseDataTypeKey = keyof typeof BASE_DATA_TYPES
export type BaseDataTypeId = typeof BASE_DATA_TYPES[BaseDataTypeKey]['id']

/**
 * ID로 기본 데이터 유형 찾기
 */
export function getBaseDataTypeById(id: string): BaseDataType | undefined {
  return Object.values(BASE_DATA_TYPES).find(dt => dt.id === id)
}

/**
 * ID가 기본 데이터 유형인지 확인
 */
export function isBaseDataType(id: string): boolean {
  const baseIds = Object.values(BASE_DATA_TYPE_IDS)
  return baseIds.includes(id as typeof baseIds[number])
}

/**
 * 모든 기본 데이터 유형 목록 반환
 */
export function getAllBaseDataTypes(): BaseDataType[] {
  return Object.values(BASE_DATA_TYPES)
}

/**
 * 대상(passage/sentence)별 기본 데이터 유형 필터링
 */
export function getBaseDataTypesByTarget(target: 'passage' | 'sentence'): BaseDataType[] {
  return Object.values(BASE_DATA_TYPES).filter(dt => dt.target === target)
}
