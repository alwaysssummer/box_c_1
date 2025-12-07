'use client'

/**
 * 문제 렌더러 - 공통 컴포넌트
 * 
 * 모든 문제 표시에 사용되는 원소스(Single Source of Truth) 렌더러
 * - 문제 관리 미리보기
 * - 조합 미리보기 (QuestionComposer)
 * - 최종 출력 (학생용)
 * - 인쇄용
 * 
 * question_types의 레이아웃 설정과 연동됨
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { formatChoices, getChoiceMarker, ChoiceMarker } from '@/lib/slot-mapper'
import { QuestionGroup } from '@/lib/slot-system'

// ============================================
// 타입 정의
// ============================================

/**
 * 문제 데이터 (generated_questions 또는 MappedQuestion에서)
 */
export interface QuestionData {
  instruction?: string | null
  body?: string | null
  choices?: string | string[] | null
  answer?: string | number | null
  explanation?: string | null
  // 분석형 데이터
  original?: string | null
  translation?: string | null
  vocabulary?: Array<{ word: string; meaning: string }> | string | null
  grammar?: string | null
}

/**
 * 레이아웃 설정 (question_types에서)
 */
export interface QuestionLayout {
  choiceLayout?: 'vertical' | 'horizontal' | 'grid2'
  choiceMarker?: ChoiceMarker
  questionGroup?: QuestionGroup
}

/**
 * 렌더러 모드
 */
export type RenderMode = 'preview' | 'print' | 'student' | 'answer'

/**
 * 렌더러 Props
 */
export interface QuestionRendererProps {
  /** 문제 데이터 */
  question: QuestionData
  
  /** 레이아웃 설정 */
  layout?: QuestionLayout
  
  /** 렌더링 모드 */
  mode?: RenderMode
  
  /** 정답 표시 여부 */
  showAnswer?: boolean
  
  /** 해설 표시 여부 */
  showExplanation?: boolean
  
  /** 문제 번호 (표시용) */
  questionNumber?: number
  
  /** 추가 클래스명 */
  className?: string
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 선택지 문자열을 배열로 변환
 */
function parseChoices(choices: string | string[] | null | undefined): string[] {
  if (!choices) return []
  if (Array.isArray(choices)) return choices
  
  // 줄바꿈으로 분리
  const lines = choices.split('\n').filter(line => line.trim())
  
  // 이미 마커가 있는 경우 제거
  return lines.map(line => {
    // ①②③④⑤, 1., (1), A. 등의 마커 제거
    return line.replace(/^[①②③④⑤⑥⑦⑧⑨⑩\d]+[.)]\s*|^\([0-9]+\)\s*|^[A-E][.)]\s*/i, '').trim()
  })
}

/**
 * 정답을 마커 형식으로 변환
 */
function formatAnswer(answer: string | number | null | undefined, marker: ChoiceMarker): string {
  if (answer === null || answer === undefined || answer === '') return ''
  
  const answerNum = typeof answer === 'number' ? answer : parseInt(String(answer), 10)
  
  if (!isNaN(answerNum) && answerNum >= 1 && answerNum <= 10) {
    return getChoiceMarker(answerNum - 1, marker)
  }
  
  return String(answer)
}

// ============================================
// 스타일 정의
// ============================================

const modeStyles: Record<RenderMode, string> = {
  preview: 'text-sm',
  print: 'text-base print:text-sm',
  student: 'text-base',
  answer: 'text-sm bg-green-50 border-green-200',
}

// ============================================
// 메인 컴포넌트
// ============================================

export function QuestionRenderer({
  question,
  layout = {},
  mode = 'preview',
  showAnswer = false,
  showExplanation = false,
  questionNumber,
  className,
}: QuestionRendererProps) {
  const {
    choiceLayout = 'vertical',
    choiceMarker = 'circle',
    questionGroup = 'practical',
  } = layout

  const isAnalysisType = questionGroup === 'analysis'
  
  // 선택지 파싱
  const choiceList = parseChoices(question.choices)
  
  // 정답 포맷
  const formattedAnswer = formatAnswer(question.answer, choiceMarker)

  // 빈 문제 체크 (instruction, body, choices 모두 없는 경우)
  const isEmpty = !question.instruction && !question.body && choiceList.length === 0
  
  if (isEmpty) {
    return (
      <div className={cn('p-4 bg-amber-50 border border-amber-200 rounded-lg', className)}>
        <div className="flex items-center gap-2 text-amber-700 text-sm">
          {questionNumber && (
            <span className="font-medium">{questionNumber}.</span>
          )}
          <span>⚠️ 문제 내용이 비어있습니다. 재생성이 필요합니다.</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'space-y-4',
      modeStyles[mode],
      className
    )}>
      {/* 지시문 */}
      {question.instruction && (
        <div className="font-medium text-foreground">
          {questionNumber && (
            <span className="mr-2 text-primary">{questionNumber}.</span>
          )}
          {question.instruction}
        </div>
      )}

      {/* 본문 (실전형) */}
      {question.body && !isAnalysisType && (
        <div className={cn(
          'p-4 rounded-lg border bg-muted/30',
          mode === 'print' && 'border-gray-300 bg-white'
        )}>
          <p className="whitespace-pre-wrap leading-relaxed">
            {question.body}
          </p>
        </div>
      )}

      {/* 원문 (분석형) */}
      {isAnalysisType && question.original && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">【원문】</div>
          <div className={cn(
            'p-4 rounded-lg border bg-blue-50/50',
            mode === 'print' && 'border-gray-300 bg-white'
          )}>
            <p className="whitespace-pre-wrap leading-relaxed">
              {question.original}
            </p>
          </div>
        </div>
      )}

      {/* 해석 (분석형) */}
      {isAnalysisType && question.translation && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">【해석】</div>
          <div className={cn(
            'p-4 rounded-lg border bg-amber-50/50',
            mode === 'print' && 'border-gray-300 bg-white'
          )}>
            <p className="whitespace-pre-wrap leading-relaxed">
              {question.translation}
            </p>
          </div>
        </div>
      )}

      {/* 어휘 (분석형) */}
      {isAnalysisType && question.vocabulary && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">【어휘】</div>
          <div className="p-3 rounded-lg border bg-green-50/50">
            {Array.isArray(question.vocabulary) ? (
              <ul className="space-y-1">
                {question.vocabulary.map((v, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{v.word}</span>
                    <span className="text-muted-foreground"> : {v.meaning}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{question.vocabulary}</p>
            )}
          </div>
        </div>
      )}

      {/* 선택지 (실전형) */}
      {choiceList.length > 0 && !isAnalysisType && (
        <ChoiceList
          choices={choiceList}
          marker={choiceMarker}
          layout={choiceLayout}
          answer={showAnswer ? question.answer : undefined}
          mode={mode}
        />
      )}

      {/* 정답 */}
      {showAnswer && formattedAnswer && (
        <div className={cn(
          'pt-3 border-t',
          mode === 'answer' ? 'border-green-300' : 'border-dashed'
        )}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded">
              정답
            </span>
            <span className="font-bold text-green-700">
              {formattedAnswer}
            </span>
          </div>
        </div>
      )}

      {/* 해설 */}
      {showExplanation && question.explanation && (
        <div className={cn(
          'pt-3',
          !showAnswer && 'border-t border-dashed'
        )}>
          <div className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded inline-block mb-2">
            해설
          </div>
          <div className={cn(
            'p-3 rounded-lg bg-blue-50/50 border border-blue-100',
            mode === 'print' && 'bg-gray-50 border-gray-200'
          )}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {question.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// 선택지 컴포넌트
// ============================================

interface ChoiceListProps {
  choices: string[]
  marker: ChoiceMarker
  layout: 'vertical' | 'horizontal' | 'grid2'
  answer?: string | number | null
  mode: RenderMode
}

function ChoiceList({ choices, marker, layout, answer, mode }: ChoiceListProps) {
  const answerIndex = answer !== undefined && answer !== null
    ? (typeof answer === 'number' ? answer - 1 : parseInt(String(answer), 10) - 1)
    : -1

  const getLayoutClass = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-wrap gap-4'
      case 'grid2':
        return 'grid grid-cols-2 gap-2'
      case 'vertical':
      default:
        return 'space-y-2'
    }
  }

  return (
    <div className={getLayoutClass()}>
      {choices.map((choice, index) => {
        const isCorrect = index === answerIndex
        
        return (
          <div
            key={index}
            className={cn(
              'flex items-start gap-2 py-1',
              isCorrect && mode !== 'student' && 'bg-green-50 -mx-2 px-2 rounded border border-green-200',
              layout === 'horizontal' && 'whitespace-nowrap'
            )}
          >
            <span className={cn(
              'font-medium shrink-0',
              isCorrect && mode !== 'student' ? 'text-green-700' : 'text-muted-foreground'
            )}>
              {getChoiceMarker(index, marker)}
            </span>
            <span className={cn(
              isCorrect && mode !== 'student' && 'text-green-700 font-medium'
            )}>
              {choice}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================
// 텍스트 렌더러 (복사/내보내기용)
// ============================================

/**
 * 문제를 텍스트로 변환 (복사, 내보내기용)
 */
export function renderQuestionToText(
  question: QuestionData,
  layout: QuestionLayout = {},
  options: {
    showAnswer?: boolean
    showExplanation?: boolean
    questionNumber?: number
  } = {}
): string {
  const {
    choiceLayout = 'vertical',
    choiceMarker = 'circle',
    questionGroup = 'practical',
  } = layout
  
  const { showAnswer = false, showExplanation = false, questionNumber } = options
  
  const lines: string[] = []
  
  // 문제 번호 + 지시문
  if (question.instruction) {
    const prefix = questionNumber ? `${questionNumber}. ` : ''
    lines.push(`${prefix}${question.instruction}`)
    lines.push('')
  }
  
  // 분석형
  if (questionGroup === 'analysis') {
    if (question.original) {
      lines.push('【원문】')
      lines.push(question.original)
      lines.push('')
    }
    if (question.translation) {
      lines.push('【해석】')
      lines.push(question.translation)
      lines.push('')
    }
  } else {
    // 실전형 본문
    if (question.body) {
      lines.push(question.body)
      lines.push('')
    }
  }
  
  // 선택지
  const choices = parseChoices(question.choices)
  if (choices.length > 0) {
    lines.push(formatChoices(choices, choiceMarker, choiceLayout))
    lines.push('')
  }
  
  // 정답
  if (showAnswer && question.answer) {
    const formattedAns = formatAnswer(question.answer, choiceMarker)
    lines.push(`정답: ${formattedAns}`)
  }
  
  // 해설
  if (showExplanation && question.explanation) {
    lines.push('')
    lines.push('【해설】')
    lines.push(question.explanation)
  }
  
  return lines.join('\n').trim()
}

export default QuestionRenderer


