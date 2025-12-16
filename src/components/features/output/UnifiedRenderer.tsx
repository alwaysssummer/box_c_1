/**
 * 통합 렌더러 (Unified Renderer)
 * 
 * OutputConfig 기반으로 문제를 렌더링합니다.
 * - mode: preview (미리보기), print (인쇄), screen (화면)
 * - viewType: student, teacher, answer_only
 * 
 * 이 컴포넌트는 사이트 전체에서 재사용됩니다:
 * - GenerationPreview (등록 전 미리보기)
 * - 강사 페이지 (출력물 생성)
 * - 실제 인쇄
 */

'use client'

import type { OutputConfig, ViewType } from '@/types/output-config'
import { QuestionItem } from './QuestionItem'
import { PageContainer } from './PageContainer'
import { paginateQuestions } from './utils/pagination'
import './styles/print.css'

interface UnifiedRendererProps {
  questions: Array<{
    id: string
    [key: string]: unknown
  }>
  outputConfig: OutputConfig
  mode: 'preview' | 'print' | 'screen'
  viewType: ViewType
  className?: string
}

export function UnifiedRenderer({
  questions,
  outputConfig,
  mode,
  viewType,
  className,
}: UnifiedRendererProps) {
  // 문제가 없으면 빈 상태 표시
  if (!questions || questions.length === 0) {
    return (
      <div className="unified-renderer empty-state">
        <p className="text-center text-muted-foreground py-8">
          표시할 문제가 없습니다.
        </p>
      </div>
    )
  }

  // 디버깅: 첫 문제의 필드 확인
  console.log('[UnifiedRenderer] First question fields:', Object.keys(questions[0]))
  console.log('[UnifiedRenderer] Has passage?', 'passage' in questions[0])
  console.log('[UnifiedRenderer] Passage value:', questions[0].passage)

  // 페이지네이션
  const pages = paginateQuestions(questions, outputConfig)

  return (
    <div className={`unified-renderer mode-${mode} ${className || ''}`}>
      {pages.map((page) => (
        <PageContainer
          key={page.pageNumber}
          pageNumber={page.pageNumber}
          config={outputConfig}
          mode={mode}
        >
          {page.questions.map((question, qIndex) => (
            <QuestionItem
              key={question.id}
              question={question}
              config={outputConfig}
              viewType={viewType}
              sequenceNumber={page.startIndex + qIndex + 1}
            />
          ))}
        </PageContainer>
      ))}
    </div>
  )
}

