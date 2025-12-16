'use client'

/**
 * 프린트 문서 렌더러 - 전체 문서 렌더링
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { 
  Block, 
  PrintLayout, 
  PrintStyle, 
  PrintDocument as PrintDocumentType,
  OverflowConfig,
} from '@/lib/print-system'
import { 
  calculateLayout, 
  DEFAULT_PRINT_STYLE, 
  DEFAULT_PASSAGE_LAYOUT,
  DEFAULT_OVERFLOW_CONFIG,
} from '@/lib/print-system'
import { PageRenderer } from './PageRenderer'
import '@/styles/print-system.css'

// ============================================
// Props 타입
// ============================================

interface PrintDocumentProps {
  /** 렌더링할 블록들 */
  blocks: Block[]
  
  /** 레이아웃 설정 */
  layout?: PrintLayout
  
  /** 스타일 설정 */
  style?: Partial<PrintStyle>
  
  /** 오버플로우 설정 */
  overflow?: Partial<OverflowConfig>
  
  /** 추가 클래스명 */
  className?: string
}

// ============================================
// 메인 컴포넌트
// ============================================

export function PrintDocument({
  blocks,
  layout = DEFAULT_PASSAGE_LAYOUT,
  style: customStyle,
  overflow: customOverflow,
  className,
}: PrintDocumentProps) {
  // 스타일 병합
  const mergedStyle: PrintStyle = useMemo(() => ({
    ...DEFAULT_PRINT_STYLE,
    ...customStyle,
  }), [customStyle])
  
  // 오버플로우 설정 병합
  const mergedOverflow: OverflowConfig = useMemo(() => ({
    ...DEFAULT_OVERFLOW_CONFIG,
    ...customOverflow,
  }), [customOverflow])
  
  // 레이아웃 계산
  const layoutResult = useMemo(() => {
    return calculateLayout(blocks, layout, mergedStyle, mergedOverflow)
  }, [blocks, layout, mergedStyle, mergedOverflow])
  
  // 빈 블록 처리
  if (blocks.length === 0) {
    return (
      <div className={cn(
        'print-document-empty',
        'flex items-center justify-center',
        'min-h-[200px] text-slate-400',
        className
      )}>
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <div>출력할 내용이 없습니다</div>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      className={cn(
        'print-document',
        'space-y-8',
        className
      )}
    >
      {/* 디버그 정보 (개발용) */}
      {process.env.NODE_ENV === 'development' && layoutResult.overflow && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded no-print">
          ⚠️ 오버플로우 발생: {layoutResult.pages.length}페이지, 
          축소율 {Math.round(layoutResult.appliedScale * 100)}%
        </div>
      )}
      
      {/* 페이지들 */}
      {layoutResult.pages.map(page => (
        <PageRenderer
          key={page.pageNumber}
          page={page}
          layout={layout}
          style={mergedStyle}
        />
      ))}
    </div>
  )
}

// ============================================
// 기존 데이터 변환 래퍼
// ============================================

/** 프레임 설정 타입 */
interface FrameConfig {
  layout: '1-column' | '2-column'
  cells: {
    left: string[]
    right: string[]
  }
  style?: {
    fontSize?: number
    lineHeight?: number
  }
}

interface LegacyPrintDocumentProps {
  /** 기존 문제 데이터 */
  questions: Array<{
    id: string
    instruction?: string
    body?: string
    choices?: string | string[]
    answer?: string | number
    explanation?: string
    passage_id?: string
    passage_name?: string
    givenBox?: string
  }>
  
  /** 출력 모드 */
  outputMode?: 'question' | 'question_answer' | 'question_answer_explanation' | 'answer_only'
  
  /** 레이아웃 설정 */
  layout?: PrintLayout
  
  /** 프레임 설정 (블록 배치) */
  frameConfig?: FrameConfig | null
  
  /** 스타일 설정 */
  style?: Partial<PrintStyle>
  
  /** 추가 클래스명 */
  className?: string
}

/**
 * 기존 데이터 형식을 지원하는 래퍼 컴포넌트
 */
export function LegacyPrintDocument({
  questions,
  outputMode = 'question',
  layout = DEFAULT_PASSAGE_LAYOUT,
  frameConfig,
  style,
  className,
}: LegacyPrintDocumentProps) {
  // 기존 데이터를 블록으로 변환 (프레임 설정 반영)
  const blocks = useMemo(() => {
    return convertLegacyToBlocks(questions, outputMode, frameConfig)
  }, [questions, outputMode, frameConfig])
  
  return (
    <PrintDocument
      blocks={blocks}
      layout={layout}
      style={style}
      className={className}
    />
  )
}

/**
 * 기존 문제 데이터를 블록으로 변환
 * frameConfig가 있으면 cells 설정에 따라 블록을 배치
 */
function convertLegacyToBlocks(
  questions: LegacyPrintDocumentProps['questions'],
  outputMode: string,
  frameConfig?: FrameConfig | null
): Block[] {
  const blocks: Block[] = []
  const shownPassages = new Set<string>()
  let questionNumber = 1
  
  const includeAnswer = outputMode === 'question_answer' || 
                        outputMode === 'question_answer_explanation' ||
                        outputMode === 'answer_only'
  const includeExplanation = outputMode === 'question_answer_explanation'
  const answerOnly = outputMode === 'answer_only'
  
  // 블록 타입 매핑 (한글 → 영문)
  const blockTypeMap: Record<string, string> = {
    '지문': 'passage',
    '문제': 'question',
    '정답': 'answer',
    '해설': 'explanation',
    '주어진 글': 'givenBox',
    'passage': 'passage',
    'question': 'question',
    'answer': 'answer',
    'explanation': 'explanation',
    'givenBox': 'givenBox',
  }
  
  // 프레임 설정이 있으면 cells 기반으로 블록 배치
  if (frameConfig && frameConfig.layout === '2-column') {
    const leftTypes = frameConfig.cells.left.map(t => blockTypeMap[t] || t).filter(Boolean)
    const rightTypes = frameConfig.cells.right.map(t => blockTypeMap[t] || t).filter(Boolean)
    
    // 좌/우측 문제 개수 계산
    const leftQuestionCount = leftTypes.filter(t => t === 'question').length
    const rightQuestionCount = rightTypes.filter(t => t === 'question').length
    
    // 정답만 모드
    if (answerOnly) {
      for (const q of questions) {
        blocks.push({
          id: `answer-${q.id}`,
          type: 'answer',
          data: { questionNumber: questionNumber++, answer: q.answer },
          position: 'full',
        })
      }
      return blocks
    }
    
    // 문제 분배: 좌측에 leftQuestionCount개, 나머지는 우측
    const leftQuestions = questions.slice(0, leftQuestionCount)
    const rightQuestions = questions.slice(leftQuestionCount, leftQuestionCount + rightQuestionCount)
    
    // 좌측 블록 생성 (지문 + 문제들)
    let leftQuestionIndex = 0
    for (const blockType of leftTypes) {
      if (blockType === 'passage') {
        // 지문은 첫 번째 문제에서 가져옴
        const firstQ = questions[0]
        if (firstQ?.body && firstQ.passage_id && !shownPassages.has(firstQ.passage_id)) {
          blocks.push({
            id: `passage-${firstQ.passage_id}`,
            type: 'passage',
            data: {
              body: firstQ.body,
              passageId: firstQ.passage_id,
              passageName: firstQ.passage_name,
            },
            position: 'left',
          })
          shownPassages.add(firstQ.passage_id)
        }
      } else if (blockType === 'question' && leftQuestionIndex < leftQuestions.length) {
        const q = leftQuestions[leftQuestionIndex]
        const choices = Array.isArray(q.choices) 
          ? q.choices 
          : typeof q.choices === 'string'
            ? (() => { try { return JSON.parse(q.choices) } catch { return [] } })()
            : []
        blocks.push({
          id: `question-${q.id}`,
          type: 'question',
          data: {
            instruction: q.instruction,
            choices,
            answer: includeAnswer ? q.answer : undefined,
            questionNumber: questionNumber++,
          },
          position: 'left',
        })
        leftQuestionIndex++
      }
    }
    
    // 우측 블록 생성 (문제들만)
    let rightQuestionIndex = 0
    for (const blockType of rightTypes) {
      if (blockType === 'question' && rightQuestionIndex < rightQuestions.length) {
        const q = rightQuestions[rightQuestionIndex]
        const choices = Array.isArray(q.choices) 
          ? q.choices 
          : typeof q.choices === 'string'
            ? (() => { try { return JSON.parse(q.choices) } catch { return [] } })()
            : []
        blocks.push({
          id: `question-${q.id}`,
          type: 'question',
          data: {
            instruction: q.instruction,
            choices,
            answer: includeAnswer ? q.answer : undefined,
            questionNumber: questionNumber++,
          },
          position: 'right',
        })
        rightQuestionIndex++
      }
    }
    
    // 해설 추가 (필요시)
    if (includeExplanation) {
      for (const q of questions) {
        if (q.explanation) {
          blocks.push({
            id: `explanation-${q.id}`,
            type: 'explanation',
            data: { explanationText: q.explanation },
            position: 'full',
          })
        }
      }
    }
    
    return blocks
  }
  
  // 기본 동작: 순차적으로 블록 생성
  for (const q of questions) {
    // 정답만 모드
    if (answerOnly) {
      blocks.push({
        id: `answer-${q.id}`,
        type: 'answer',
        data: {
          questionNumber: questionNumber++,
          answer: q.answer,
        },
      })
      continue
    }
    
    // 지문 블록
    if (q.body && q.passage_id && !shownPassages.has(q.passage_id)) {
      blocks.push({
        id: `passage-${q.passage_id}`,
        type: 'passage',
        data: {
          body: q.body,
          passageId: q.passage_id,
          passageName: q.passage_name,
        },
      })
      shownPassages.add(q.passage_id)
    }
    
    // 주어진 글 블록
    if (q.givenBox) {
      blocks.push({
        id: `givenbox-${q.id}`,
        type: 'givenBox',
        data: {
          givenBoxContent: q.givenBox,
        },
      })
    }
    
    // 문제 블록
    const choices = Array.isArray(q.choices) 
      ? q.choices 
      : typeof q.choices === 'string'
        ? (() => { try { return JSON.parse(q.choices) } catch { return [] } })()
        : []
    
    blocks.push({
      id: `question-${q.id}`,
      type: 'question',
      data: {
        instruction: q.instruction,
        choices,
        answer: includeAnswer ? q.answer : undefined,
        questionNumber: questionNumber++,
      },
    })
    
    // 해설 블록
    if (includeExplanation && q.explanation) {
      blocks.push({
        id: `explanation-${q.id}`,
        type: 'explanation',
        data: {
          explanationText: q.explanation,
        },
      })
    }
  }
  
  return blocks
}

/**
 * 블록 타입에 따라 블록 생성
 */
function createBlockByType(
  q: LegacyPrintDocumentProps['questions'][0],
  blockType: string,
  questionNumber: number,
  shownPassages: Set<string>,
  includeAnswer: boolean,
  includeExplanation: boolean
): (Block & { position?: string }) | null {
  switch (blockType) {
    case 'passage':
      if (q.body && q.passage_id && !shownPassages.has(q.passage_id)) {
        shownPassages.add(q.passage_id)
        return {
          id: `passage-${q.passage_id}`,
          type: 'passage',
          data: {
            body: q.body,
            passageId: q.passage_id,
            passageName: q.passage_name,
          },
        }
      }
      return null
      
    case 'question':
      const choices = Array.isArray(q.choices) 
        ? q.choices 
        : typeof q.choices === 'string'
          ? (() => { try { return JSON.parse(q.choices) } catch { return [] } })()
          : []
      return {
        id: `question-${q.id}-${questionNumber}`,
        type: 'question',
        data: {
          instruction: q.instruction,
          choices,
          answer: includeAnswer ? q.answer : undefined,
          questionNumber,
        },
      }
      
    case 'answer':
      if (includeAnswer) {
        return {
          id: `answer-${q.id}`,
          type: 'answer',
          data: {
            questionNumber,
            answer: q.answer,
          },
        }
      }
      return null
      
    case 'explanation':
      if (includeExplanation && q.explanation) {
        return {
          id: `explanation-${q.id}`,
          type: 'explanation',
          data: {
            explanationText: q.explanation,
          },
        }
      }
      return null
      
    case 'givenBox':
      if (q.givenBox) {
        return {
          id: `givenbox-${q.id}`,
          type: 'givenBox',
          data: {
            givenBoxContent: q.givenBox,
          },
        }
      }
      return null
      
    default:
      return null
  }
}

