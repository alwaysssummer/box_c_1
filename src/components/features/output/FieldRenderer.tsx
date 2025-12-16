/**
 * 필드 렌더러
 * 
 * 개별 필드(passage, question, choices 등)를 렌더링합니다.
 */

import type { FieldPlacement, ChoiceMarker, ChoiceLayout } from '@/types/output-config'
import { getChoiceMarker } from '@/types/output-config'

interface FieldRendererProps {
  field: FieldPlacement
  value: unknown
  choiceMarker?: ChoiceMarker
  choiceLayout?: ChoiceLayout
}

export function FieldRenderer({
  field,
  value,
  choiceMarker = 'circled',
  choiceLayout = 'vertical',
}: FieldRendererProps) {
  // 값이 없으면 렌더링하지 않음
  if (value === null || value === undefined) {
    return null
  }

  const fieldKey = field.key
  const fieldLabel = field.label || fieldKey
  const span = field.span || 1

  // 필드별 렌더링 로직
  const renderContent = () => {
    // passage/body 필드: 특별 처리 (지문)
    if ((fieldKey === 'passage' || fieldKey === 'body') && typeof value === 'string') {
      return (
        <div className="field-content" style={{ whiteSpace: 'pre-wrap' }}>
          {value}
        </div>
      )
    }

    // choices 필드: 특별 처리
    if (fieldKey === 'choices' && Array.isArray(value)) {
      return (
        <div className={`field-choices layout-${choiceLayout}`}>
          {value.map((choice, index) => (
            <div key={index} className="choice-item">
              <span className="choice-marker">
                {getChoiceMarker(index, choiceMarker)}
              </span>
              <span className="choice-text">{String(choice)}</span>
            </div>
          ))}
        </div>
      )
    }

    // 배열 필드: 리스트로 렌더링
    if (Array.isArray(value)) {
      return (
        <ul className="field-list">
          {value.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      )
    }

    // 객체 필드: JSON으로 표시 (fallback)
    if (typeof value === 'object') {
      return <pre className="field-object">{JSON.stringify(value, null, 2)}</pre>
    }

    // 일반 텍스트: 그대로 표시
    return <div className="field-content">{String(value)}</div>
  }

  return (
    <div
      className={`field-container field-${fieldKey} ${span === 2 ? 'field-span-2' : ''}`}
      style={field.style ? {
        fontSize: field.style.fontSize ? `${field.style.fontSize}pt` : undefined,
        fontWeight: field.style.fontWeight,
        textAlign: field.style.textAlign,
        marginTop: field.style.marginTop ? `${field.style.marginTop}px` : undefined,
        marginBottom: field.style.marginBottom ? `${field.style.marginBottom}px` : undefined,
      } : undefined}
    >
      {/* 필드 라벨은 화면 모드에서만 표시 (인쇄 시 생략 가능) */}
      {/* <div className="field-label no-print">{fieldLabel}</div> */}
      {renderContent()}
    </div>
  )
}

