/**
 * 문제 아이템 렌더러
 * 
 * 개별 문제를 렌더링합니다.
 */

'use client'

import type { OutputConfig, ViewType } from '@/types/output-config'
import { filterFieldsForView } from './utils/field-filter'
import { FieldRenderer } from './FieldRenderer'

interface QuestionItemProps {
  question: {
    id: string
    _meta?: {
      textbookName?: string
      unitName?: string
      passageName?: string
      questionTypeName?: string
    }
    [key: string]: unknown
  }
  config: OutputConfig
  viewType: ViewType
  sequenceNumber?: number
}

export function QuestionItem({
  question,
  config,
  viewType,
  sequenceNumber,
}: QuestionItemProps) {
  // 현재 뷰 타입에 맞는 필드만 필터링
  const visibleFields = filterFieldsForView(config.fields, viewType)

  // 2단 레이아웃 여부
  const isColumnLayout = config.columns === 2

  return (
    <div className="question-item">
      {/* ⭐ 상단 헤더: 교재명 > 유형명 */}
      {question._meta && (question._meta.textbookName || question._meta.questionTypeName) && (
        <div className="question-header" style={{
          fontSize: '11pt',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: '12px',
          paddingBottom: '6px',
          borderBottom: '2px solid #333',
        }}>
          {question._meta.textbookName && <span>{question._meta.textbookName}</span>}
          {question._meta.textbookName && question._meta.questionTypeName && <span> &gt; </span>}
          {question._meta.questionTypeName && <span>{question._meta.questionTypeName}</span>}
        </div>
      )}

      {/* ⭐ 문제 번호 + 단원명 > 지문번호 */}
      {sequenceNumber !== undefined && (
        <div className="question-number-with-meta" style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '14pt', fontWeight: 'bold' }}>
            {sequenceNumber}.
          </span>
          {question._meta && (question._meta.unitName || question._meta.passageName) && (
            <span style={{ fontSize: '9pt', color: '#666' }}>
              {question._meta.unitName && <span>{question._meta.unitName}</span>}
              {question._meta.unitName && question._meta.passageName && <span> &gt; </span>}
              {question._meta.passageName && <span>{question._meta.passageName}</span>}
            </span>
          )}
        </div>
      )}

      {/* 필드 렌더링 */}
      <div className={isColumnLayout ? 'columns-2' : 'columns-1'}>
        {visibleFields.map((field) => {
          const value = question[field.key]
          
          return (
            <FieldRenderer
              key={field.key}
              field={field}
              value={value}
              choiceMarker={config.options.choiceMarker}
              choiceLayout={config.options.choiceLayout}
            />
          )
        })}
      </div>
    </div>
  )
}

