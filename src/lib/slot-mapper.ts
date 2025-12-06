/**
 * 출제 2단계 시스템 - 2단계: 슬롯 자동 매핑
 * 
 * 저장된 슬롯 데이터를 템플릿 슬롯에 자동 매핑하여 문제 조합
 */

import { SlotName, QuestionGroup, REQUIRED_SLOTS, getSlotLabel } from './slot-system'

// ============================================
// 타입 정의
// ============================================

/**
 * 매핑된 문제 데이터
 */
export interface MappedQuestion {
  /** 슬롯별 데이터 */
  slots: Record<SlotName, unknown>
  
  /** 매핑 메타 정보 */
  meta: {
    passageId: string
    passageName: string
    questionTypeId: string
    questionTypeName: string
    questionGroup: QuestionGroup
    mappedAt: string
  }
}

/**
 * 매핑 결과
 */
export interface MappingResult {
  success: boolean
  question?: MappedQuestion
  errors: string[]
  warnings: string[]
}

/**
 * 일괄 매핑 결과
 */
export interface BatchMappingResult {
  total: number
  successful: number
  failed: number
  questions: MappedQuestion[]
  errors: { passageId: string; error: string }[]
}

/**
 * 문제 유형 템플릿 정보
 */
export interface QuestionTemplate {
  id: string
  name: string
  group: QuestionGroup
  requiredSlots: SlotName[]
  optionalSlots?: SlotName[]
  instruction?: string
}

// ============================================
// 슬롯 매핑 함수
// ============================================

/**
 * 슬롯 데이터를 템플릿에 매핑
 */
export function mapDataToTemplate(
  slotData: Record<string, unknown>,
  template: QuestionTemplate,
  passageInfo: { id: string; name: string }
): MappingResult {
  const errors: string[] = []
  const warnings: string[] = []
  const slots: Record<string, unknown> = {}
  
  // 필수 슬롯 매핑
  for (const slot of template.requiredSlots) {
    if (slotData[slot] !== undefined && slotData[slot] !== null && slotData[slot] !== '') {
      slots[slot] = slotData[slot]
    } else {
      errors.push(`필수 슬롯 누락: ${getSlotLabel(slot)}`)
    }
  }
  
  // 선택 슬롯 매핑
  if (template.optionalSlots) {
    for (const slot of template.optionalSlots) {
      if (slotData[slot] !== undefined && slotData[slot] !== null && slotData[slot] !== '') {
        slots[slot] = slotData[slot]
      } else {
        warnings.push(`선택 슬롯 없음: ${getSlotLabel(slot)}`)
      }
    }
  }
  
  // 에러가 있으면 실패
  if (errors.length > 0) {
    return {
      success: false,
      errors,
      warnings,
    }
  }
  
  // 성공
  return {
    success: true,
    question: {
      slots: slots as Record<SlotName, unknown>,
      meta: {
        passageId: passageInfo.id,
        passageName: passageInfo.name,
        questionTypeId: template.id,
        questionTypeName: template.name,
        questionGroup: template.group,
        mappedAt: new Date().toISOString(),
      },
    },
    errors,
    warnings,
  }
}

/**
 * 여러 지문에 대해 일괄 매핑
 */
export function batchMapDataToTemplate(
  passageSlotDataList: Array<{
    passageId: string
    passageName: string
    slotData: Record<string, unknown>
  }>,
  template: QuestionTemplate
): BatchMappingResult {
  const questions: MappedQuestion[] = []
  const errors: { passageId: string; error: string }[] = []
  
  for (const item of passageSlotDataList) {
    const result = mapDataToTemplate(
      item.slotData,
      template,
      { id: item.passageId, name: item.passageName }
    )
    
    if (result.success && result.question) {
      questions.push(result.question)
    } else {
      errors.push({
        passageId: item.passageId,
        error: result.errors.join(', '),
      })
    }
  }
  
  return {
    total: passageSlotDataList.length,
    successful: questions.length,
    failed: errors.length,
    questions,
    errors,
  }
}

// ============================================
// 렌더링 유틸리티
// ============================================

/**
 * 선택지 마커 타입
 */
export type ChoiceMarker = 'circle' | 'number' | 'alpha' | 'paren'

/**
 * 선택지 마커 변환
 */
export function getChoiceMarker(index: number, marker: ChoiceMarker): string {
  switch (marker) {
    case 'circle':
      return '①②③④⑤⑥⑦⑧⑨⑩'[index] || `(${index + 1})`
    case 'number':
      return `${index + 1}.`
    case 'alpha':
      return `${'ABCDEFGHIJ'[index] || String.fromCharCode(65 + index)}.`
    case 'paren':
      return `(${index + 1})`
    default:
      return `${index + 1}.`
  }
}

/**
 * 선택지 포맷팅
 */
export function formatChoices(
  choices: string[],
  marker: ChoiceMarker = 'circle',
  layout: 'vertical' | 'horizontal' | 'grid2' = 'vertical'
): string {
  const formatted = choices.map((choice, i) => 
    `${getChoiceMarker(i, marker)} ${choice}`
  )
  
  switch (layout) {
    case 'horizontal':
      return formatted.join('  ')
    case 'grid2':
      // 2열 그리드
      const rows: string[] = []
      for (let i = 0; i < formatted.length; i += 2) {
        if (i + 1 < formatted.length) {
          rows.push(`${formatted[i]}    ${formatted[i + 1]}`)
        } else {
          rows.push(formatted[i])
        }
      }
      return rows.join('\n')
    case 'vertical':
    default:
      return formatted.join('\n')
  }
}

/**
 * 정답 포맷팅
 */
export function formatAnswer(answer: unknown, marker: ChoiceMarker = 'circle'): string {
  if (typeof answer === 'number') {
    return getChoiceMarker(answer - 1, marker)
  }
  return String(answer)
}

// ============================================
// 템플릿 렌더러
// ============================================

/**
 * 기본 문제 렌더러 (텍스트 출력)
 */
export function renderQuestionAsText(
  question: MappedQuestion,
  options: {
    includeAnswer?: boolean
    includeExplanation?: boolean
    choiceMarker?: ChoiceMarker
    choiceLayout?: 'vertical' | 'horizontal' | 'grid2'
  } = {}
): string {
  const {
    includeAnswer = false,
    includeExplanation = false,
    choiceMarker = 'circle',
    choiceLayout = 'vertical',
  } = options
  
  const { slots } = question
  const lines: string[] = []
  
  // 지시문
  if (slots.instruction) {
    lines.push(String(slots.instruction))
    lines.push('')
  }
  
  // 본문
  if (slots.body) {
    lines.push(String(slots.body))
    lines.push('')
  }
  
  // 원문 (분석형)
  if (slots.original) {
    lines.push(String(slots.original))
    lines.push('')
  }
  
  // 해석 (분석형)
  if (slots.translation) {
    lines.push(String(slots.translation))
    lines.push('')
  }
  
  // 선택지
  if (slots.choices) {
    const choices = Array.isArray(slots.choices) 
      ? slots.choices 
      : String(slots.choices).split('\n').filter(Boolean)
    lines.push(formatChoices(choices as string[], choiceMarker, choiceLayout))
    lines.push('')
  }
  
  // 정답
  if (includeAnswer && slots.answer !== undefined) {
    lines.push(`정답: ${formatAnswer(slots.answer, choiceMarker)}`)
  }
  
  // 해설
  if (includeExplanation && slots.explanation) {
    lines.push('')
    lines.push(`해설: ${slots.explanation}`)
  }
  
  return lines.join('\n').trim()
}

/**
 * 분석형 데이터 렌더러
 */
export function renderAnalysisAsText(
  question: MappedQuestion,
  options: {
    includeVocabulary?: boolean
    includeGrammar?: boolean
  } = {}
): string {
  const { includeVocabulary = true, includeGrammar = true } = options
  const { slots } = question
  const lines: string[] = []
  
  // 원문
  if (slots.original) {
    lines.push('【원문】')
    lines.push(String(slots.original))
    lines.push('')
  }
  
  // 해석
  if (slots.translation) {
    lines.push('【해석】')
    lines.push(String(slots.translation))
    lines.push('')
  }
  
  // 어휘
  if (includeVocabulary && slots.vocabulary) {
    lines.push('【어휘】')
    if (Array.isArray(slots.vocabulary)) {
      lines.push(slots.vocabulary.map(v => {
        if (typeof v === 'object' && v !== null && 'word' in v) {
          const vocab = v as { word: string; meaning: string }
          return `• ${vocab.word}: ${vocab.meaning}`
        }
        return `• ${String(v)}`
      }).join('\n'))
    } else {
      lines.push(String(slots.vocabulary))
    }
    lines.push('')
  }
  
  // 문법
  if (includeGrammar && slots.grammar) {
    lines.push('【문법】')
    lines.push(String(slots.grammar))
  }
  
  return lines.join('\n').trim()
}

// ============================================
// 그룹별 기본 템플릿
// ============================================

/**
 * 그룹별 기본 템플릿 생성
 */
export function getDefaultTemplate(
  group: QuestionGroup,
  questionTypeId: string,
  questionTypeName: string
): QuestionTemplate {
  const requiredSlots = REQUIRED_SLOTS[group] || []
  
  return {
    id: questionTypeId,
    name: questionTypeName,
    group,
    requiredSlots,
  }
}



