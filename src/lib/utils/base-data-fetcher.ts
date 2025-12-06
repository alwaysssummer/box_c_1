/**
 * 기본 데이터 조회 유틸리티
 * 
 * AI 호출 없이 기존 데이터베이스에서 기본 데이터를 조회합니다.
 */

import { createClient } from '@/lib/supabase/server'
import { BASE_DATA_TYPE_IDS, getBaseDataTypeById, isBaseDataType } from '@/lib/constants/base-data-types'

export interface SentenceData {
  sentence_no: number
  content: string
  korean_translation: string | null
}

export interface BaseDataResult {
  success: boolean
  data: string | SentenceData[] | null
  error?: string
}

/**
 * 기본 데이터 조회
 */
export async function fetchBaseData(
  passageId: string,
  baseDataTypeId: string
): Promise<BaseDataResult> {
  if (!isBaseDataType(baseDataTypeId)) {
    return {
      success: false,
      data: null,
      error: '기본 데이터 유형이 아닙니다.',
    }
  }

  const baseDataType = getBaseDataTypeById(baseDataTypeId)
  if (!baseDataType) {
    return {
      success: false,
      data: null,
      error: '알 수 없는 기본 데이터 유형입니다.',
    }
  }

  const supabase = await createClient()

  try {
    switch (baseDataTypeId) {
      case BASE_DATA_TYPE_IDS.PASSAGE_ENGLISH: {
        // 영어 지문 전체
        const { data: passage, error } = await supabase
          .from('passages')
          .select('content')
          .eq('id', passageId)
          .single()

        if (error) throw error
        return {
          success: true,
          data: passage?.content || null,
        }
      }

      case BASE_DATA_TYPE_IDS.PASSAGE_KOREAN: {
        // 한글 해석 (문장별 번역 합침)
        const { data: sentences, error } = await supabase
          .from('sentences')
          .select('korean_translation')
          .eq('passage_id', passageId)
          .order('sentence_no', { ascending: true })

        if (error) throw error
        const koreanText = sentences
          ?.map(s => s.korean_translation)
          .filter(Boolean)
          .join(' ')
        return {
          success: true,
          data: koreanText || null,
        }
      }

      case BASE_DATA_TYPE_IDS.SENTENCE_ENGLISH: {
        // 영어 문장 목록
        const { data: sentences, error } = await supabase
          .from('sentences')
          .select('sentence_no, content, korean_translation')
          .eq('passage_id', passageId)
          .order('sentence_no', { ascending: true })

        if (error) throw error
        return {
          success: true,
          data: sentences as SentenceData[],
        }
      }

      case BASE_DATA_TYPE_IDS.SENTENCE_KOREAN: {
        // 한글 문장 목록 (영어도 함께 반환)
        const { data: sentences, error } = await supabase
          .from('sentences')
          .select('sentence_no, content, korean_translation')
          .eq('passage_id', passageId)
          .order('sentence_no', { ascending: true })

        if (error) throw error
        return {
          success: true,
          data: sentences as SentenceData[],
        }
      }

      default:
        return {
          success: false,
          data: null,
          error: '지원하지 않는 기본 데이터 유형입니다.',
        }
    }
  } catch (error) {
    console.error('기본 데이터 조회 오류:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 여러 기본 데이터 유형 일괄 조회
 */
export async function fetchMultipleBaseData(
  passageId: string,
  baseDataTypeIds: string[]
): Promise<Record<string, BaseDataResult>> {
  const results: Record<string, BaseDataResult> = {}

  await Promise.all(
    baseDataTypeIds.map(async (id) => {
      results[id] = await fetchBaseData(passageId, id)
    })
  )

  return results
}
