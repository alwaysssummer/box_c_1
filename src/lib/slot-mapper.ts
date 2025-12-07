/**
 * 슬롯 매퍼 - 문제 조합 유틸리티
 * 
 * 슬롯 데이터를 문제 템플릿에 매핑하고 렌더링합니다.
 */

import { QuestionGroup } from './slot-system'

// ============================================
// 타입 정의
// ============================================

export type ChoiceMarker = 'circle' | 'number' | 'alpha' | 'paren'

export interface QuestionTemplate {
  id: string
  name: string
  group: QuestionGroup
  requiredSlots: string[]
  optionalSlots?: string[]
}

export interface MappedQuestion {
  slots: Record<string, unknown>
  meta: {
    passageId: string
    passageName: string
    templateId: string
    templateName: string
  }
}

export interface BatchMappingResult {
  total: number
  successful: number
  failed: number
  questions: MappedQuestion[]
  errors: Array<{
    passageId: string
    passageName: string
    error: string
  }>
}

// ============================================
// 마커 유틸리티
// ============================================

const MARKERS: Record<ChoiceMarker, string[]> = {
  circle: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
  number: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.'],
  alpha: ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'I.', 'J.'],
  paren: ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)'],
}

/**
 * 마커 가져오기
 */
export function getChoiceMarker(index: number, marker: ChoiceMarker): string {
  return MARKERS[marker][index] || `(${index + 1})`
}

/**
 * 선택지 포맷팅
 */
export function formatChoices(
  choices: string[],
  marker: ChoiceMarker,
  layout: 'vertical' | 'horizontal' | 'grid2'
): string {
  const formatted = choices.map((choice, i) => 
    `${getChoiceMarker(i, marker)} ${choice}`
  )
  
  switch (layout) {
    case 'horizontal':
      return formatted.join('  ')
    case 'grid2':
      return formatted.map((c, i) => i % 2 === 1 ? c + '\n' : c).join('  ')
    case 'vertical':
    default:
      return formatted.join('\n')
  }
}

// ============================================
// 매핑 함수
// ============================================

/**
 * 단일 지문을 템플릿에 매핑
 */
export function mapDataToTemplate(
  passageId: string,
  passageName: string,
  slotData: Record<string, unknown>,
  template: QuestionTemplate
): MappedQuestion | null {
  // 필수 슬롯 검증
  for (const slot of template.requiredSlots) {
    if (!slotData[slot]) {
      return null
    }
  }

  return {
    slots: { ...slotData },
    meta: {
      passageId,
      passageName,
      templateId: template.id,
      templateName: template.name,
    },
  }
}

/**
 * 여러 지문을 일괄 매핑
 */
export function batchMapDataToTemplate(
  passages: Array<{
    passageId: string
    passageName: string
    slotData: Record<string, unknown>
  }>,
  template: QuestionTemplate
): BatchMappingResult {
  const questions: MappedQuestion[] = []
  const errors: Array<{ passageId: string; passageName: string; error: string }> = []

  for (const passage of passages) {
    const question = mapDataToTemplate(
      passage.passageId,
      passage.passageName,
      passage.slotData,
      template
    )

    if (question) {
      questions.push(question)
    } else {
      errors.push({
        passageId: passage.passageId,
        passageName: passage.passageName,
        error: '필수 슬롯이 누락되었습니다.',
      })
    }
  }

  return {
    total: passages.length,
    successful: questions.length,
    failed: errors.length,
    questions,
    errors,
  }
}

// ============================================
// 렌더링 함수
// ============================================

/**
 * 문제를 텍스트로 렌더링
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

  const lines: string[] = []

  // 지시문
  if (question.slots.instruction) {
    lines.push(String(question.slots.instruction))
    lines.push('')
  }

  // 본문
  if (question.slots.body) {
    lines.push(String(question.slots.body))
    lines.push('')
  }

  // 선택지
  if (question.slots.choices) {
    const choices = Array.isArray(question.slots.choices)
      ? question.slots.choices
      : String(question.slots.choices).split('\n').filter(Boolean)
    
    lines.push(formatChoices(choices, choiceMarker, choiceLayout))
    lines.push('')
  }

  // 정답
  if (includeAnswer && question.slots.answer) {
    lines.push(`정답: ${question.slots.answer}`)
  }

  // 해설
  if (includeExplanation && question.slots.explanation) {
    lines.push('')
    lines.push(`【해설】${question.slots.explanation}`)
  }

  return lines.join('\n').trim()
}

/**
 * 분석형 자료를 텍스트로 렌더링
 */
export function renderAnalysisAsText(
  question: MappedQuestion,
  options: {
    includeVocabulary?: boolean
    includeGrammar?: boolean
  } = {}
): string {
  const { includeVocabulary = true, includeGrammar = false } = options
  const lines: string[] = []

  // 원문
  if (question.slots.original) {
    lines.push('【원문】')
    lines.push(String(question.slots.original))
    lines.push('')
  }

  // 해석
  if (question.slots.translation) {
    lines.push('【해석】')
    lines.push(String(question.slots.translation))
    lines.push('')
  }

  // 어휘
  if (includeVocabulary && question.slots.vocabulary) {
    lines.push('【어휘】')
    lines.push(String(question.slots.vocabulary))
    lines.push('')
  }

  // 문법
  if (includeGrammar && question.slots.grammar) {
    lines.push('【문법】')
    lines.push(String(question.slots.grammar))
  }

  return lines.join('\n').trim()
}
