'use client'

import { cn } from '@/lib/utils'
import type { OutputConfig, FieldPlacement, ViewType } from '@/types/output-config'
import { getFieldsForView, getChoiceMarker } from '@/types/output-config'

interface GridRendererProps {
  config: OutputConfig
  viewType: ViewType
  data?: Record<string, unknown>
  className?: string
  scale?: number
}

/**
 * 그리드 렌더러 - OutputConfig 기반 1열/2열 레이아웃 렌더링
 */
export function GridRenderer({ 
  config, 
  viewType, 
  data = {}, 
  className,
  scale = 1 
}: GridRendererProps) {
  const visibleFields = getFieldsForView(config.fields, viewType)
  
  // A4 용지 비율 (210mm x 297mm)
  const paperWidth = config.paper.size === 'A4' ? 210 : 182  // B5: 182mm
  const paperHeight = config.paper.size === 'A4' ? 297 : 257 // B5: 257mm
  
  // 가로/세로 방향
  const isLandscape = config.paper.orientation === 'landscape'
  const width = isLandscape ? paperHeight : paperWidth
  const height = isLandscape ? paperWidth : paperHeight
  
  // 실제 콘텐츠 영역 (여백 제외)
  const contentWidth = width - config.paper.margins.left - config.paper.margins.right
  const contentHeight = height - config.paper.margins.top - config.paper.margins.bottom
  
  // 2열 모드에서 span 계산
  const getGridColumn = (field: FieldPlacement, idx: number): string => {
    if (config.columns === 1) return 'span 1 / span 1'
    
    if (field.span === 2) return '1 / -1' // 전체 너비
    
    // 병렬 모드일 때
    if (config.parallel) {
      return idx % 2 === 0 ? 'span 1 / span 1' : 'span 1 / span 1'
    }
    
    return 'span 1 / span 1'
  }
  
  // 필드 렌더링
  const renderField = (field: FieldPlacement, idx: number) => {
    const fieldData = data[field.key]
    const style: React.CSSProperties = {
      gridColumn: getGridColumn(field, idx),
      fontSize: `${(field.style?.fontSize || config.typography.baseFontSize) * scale}pt`,
      fontWeight: field.style?.fontWeight || 'normal',
      textAlign: field.style?.textAlign || 'left',
      marginTop: (field.style?.marginTop || 0) * scale,
      marginBottom: (field.style?.marginBottom || 0) * scale,
      lineHeight: config.typography.lineHeight,
    }
    
    // 필드 타입에 따른 렌더링
    if (field.key === 'choices' && Array.isArray(fieldData)) {
      return (
        <div key={`${field.key}-${idx}`} style={style} className="field-choices">
          {renderChoices(fieldData as string[])}
        </div>
      )
    }
    
    // 배열 데이터
    if (Array.isArray(fieldData)) {
      return (
        <div key={`${field.key}-${idx}`} style={style} className="field-array">
          {fieldData.map((item, i) => (
            <div key={i}>{String(item)}</div>
          ))}
        </div>
      )
    }
    
    // 객체 데이터
    if (typeof fieldData === 'object' && fieldData !== null) {
      return (
        <div key={`${field.key}-${idx}`} style={style} className="field-object">
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(fieldData, null, 2)}
          </pre>
        </div>
      )
    }
    
    // 텍스트 데이터
    return (
      <div key={`${field.key}-${idx}`} style={style} className="field-text">
        {fieldData !== undefined ? String(fieldData) : `[${field.label || field.key}]`}
      </div>
    )
  }
  
  // 선택지 렌더링
  const renderChoices = (choices: string[]) => {
    const isHorizontal = config.options.choiceLayout === 'horizontal'
    
    return (
      <div className={cn(
        "choices-container",
        isHorizontal ? "flex flex-wrap gap-4" : "space-y-1"
      )}>
        {choices.map((choice, idx) => (
          <div key={idx} className="flex items-start gap-1">
            <span className="choice-marker font-medium">
              {getChoiceMarker(idx, config.options.choiceMarker)}
            </span>
            <span>{choice}</span>
          </div>
        ))}
      </div>
    )
  }
  
  // 병렬 모드 렌더링 (쌍으로 묶음)
  const renderParallelMode = () => {
    const pairs: FieldPlacement[][] = []
    for (let i = 0; i < visibleFields.length; i += 2) {
      pairs.push(visibleFields.slice(i, i + 2))
    }
    
    return pairs.map((pair, pairIdx) => (
      <div key={pairIdx} className="grid grid-cols-2 gap-2">
        {pair.map((field, idx) => renderField(field, pairIdx * 2 + idx))}
      </div>
    ))
  }
  
  // 반복 모드 렌더링 (문장분석용)
  const renderRepeatMode = () => {
    // 데이터에서 반복 항목 찾기 (예: sentences 배열)
    const repeatData = data.sentences as unknown[] || data.items as unknown[] || [data]
    
    return repeatData.map((item, repeatIdx) => (
      <div 
        key={repeatIdx} 
        className={cn(
          "repeat-item border-b pb-3 mb-3",
          repeatIdx === repeatData.length - 1 && "border-b-0 pb-0 mb-0"
        )}
      >
        <div 
          className={cn(
            "grid gap-2",
            config.columns === 2 ? "grid-cols-2" : "grid-cols-1"
          )}
          style={{
            columnGap: (config.columnGap || 5) * scale,
          }}
        >
          {visibleFields.map((field, idx) => {
            const itemData = typeof item === 'object' && item !== null
              ? (item as Record<string, unknown>)[field.key]
              : undefined
            return renderField(field, idx)
          })}
        </div>
      </div>
    ))
  }
  
  return (
    <div 
      className={cn(
        "grid-renderer bg-white shadow-lg rounded overflow-hidden",
        className
      )}
      style={{
        width: width * scale * 3,  // 확대해서 보기 좋게
        minHeight: height * scale * 3,
        padding: `${config.paper.margins.top * scale * 3}px ${config.paper.margins.right * scale * 3}px ${config.paper.margins.bottom * scale * 3}px ${config.paper.margins.left * scale * 3}px`,
        fontFamily: 'Pretendard, -apple-system, system-ui, sans-serif',
      }}
    >
      {/* 반복 모드 */}
      {config.repeat ? (
        renderRepeatMode()
      ) : config.parallel && config.columns === 2 ? (
        // 병렬 모드 (쌍으로 묶음)
        renderParallelMode()
      ) : (
        // 기본 그리드
        <div 
          className={cn(
            "grid gap-3",
            config.columns === 2 ? "grid-cols-2" : "grid-cols-1"
          )}
          style={{
            columnGap: (config.columnGap || 5) * scale * 3,
          }}
        >
          {visibleFields.map((field, idx) => renderField(field, idx))}
        </div>
      )}
      
      {/* 페이지 번호 */}
      {config.options.pageNumbers && (
        <div 
          className={cn(
            "page-number text-center text-xs text-gray-500 mt-4",
            config.options.pageNumberPosition === 'bottom-right' && "text-right"
          )}
        >
          {config.options.pageNumberFormat === 'number_of_total' ? '1 / 1' : '1'}
        </div>
      )}
    </div>
  )
}

/**
 * 미리보기용 그리드 렌더러 (샘플 데이터 포함)
 */
export function GridPreview({ 
  config, 
  viewType = 'student',
  className 
}: { 
  config: OutputConfig
  viewType?: ViewType
  className?: string 
}) {
  // 샘플 데이터 생성
  const sampleData: Record<string, unknown> = {}
  
  config.fields.forEach(field => {
    switch (field.key) {
      case 'passage':
        sampleData.passage = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'
        break
      case 'question':
        sampleData.question = 'What is the main idea of the passage?'
        break
      case 'choices':
        sampleData.choices = [
          'The importance of exercise',
          'The benefits of reading',
          'The value of hard work',
          'The meaning of life',
          'None of the above'
        ]
        break
      case 'answer':
        sampleData.answer = '③'
        break
      case 'explanation':
        sampleData.explanation = 'The passage discusses the value of hard work and dedication in achieving success.'
        break
      case 'english':
        sampleData.english = 'This is a sample English sentence.'
        break
      case 'korean':
        sampleData.korean = '이것은 샘플 한국어 문장입니다.'
        break
      default:
        sampleData[field.key] = `[${field.label || field.key} 샘플]`
    }
  })
  
  return (
    <GridRenderer 
      config={config} 
      viewType={viewType} 
      data={sampleData}
      className={className}
      scale={1}
    />
  )
}




