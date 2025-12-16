'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { LayoutConfig } from '@/types/database'
import type { OutputConfig, ViewType } from '@/types/output-config'

// 선택지 마커 변환
const CHOICE_MARKERS: Record<string, string[]> = {
  number_circle: ['①', '②', '③', '④', '⑤'],
  alpha_circle: ['ⓐ', 'ⓑ', 'ⓒ', 'ⓓ', 'ⓔ'],
  number_dot: ['1.', '2.', '3.', '4.', '5.'],
}

interface PreviewCardProps {
  content: Record<string, unknown>
  passage?: string  // 원본 지문
  layoutConfig?: LayoutConfig
  outputConfig?: OutputConfig
  sequenceNumber?: number  // 순번
  textbookName?: string    // ⭐ 교재명
  unitName?: string        // 단원명
  passageName?: string     // 지문명
}

export function PreviewCard({ content, passage, layoutConfig, outputConfig, sequenceNumber, textbookName, unitName, passageName }: PreviewCardProps) {
  const [activeTab, setActiveTab] = useState('student')
  
  // 원본 지문이 있으면 content에 추가
  const mergedContent = {
    ...content,
    ...(passage ? { passage } : {})
  }
  
  // 기본 뷰 설정 (question 포함!)
  const defaultViews = {
    student: ['passage', 'question', 'choices'],
    answer: ['question', 'choices', 'answer'],
    teacher: ['passage', 'question', 'choices', 'answer', 'explanation']
  }
  
  // 레이아웃 설정 (views는 기본값 사용)
  const config: LayoutConfig = {
    placement_mode: layoutConfig?.placement_mode || 'free_flow',
    columns: layoutConfig?.columns || 1,
    choice_layout: layoutConfig?.choice_layout || 'vertical',
    choice_marker: layoutConfig?.choice_marker || 'number_circle',
    views: layoutConfig?.views || defaultViews
  }
  
  // ⭐ output_config에서 현재 뷰에 표시할 필드 가져오기 (우선순위 높음)
  let currentViewFields: string[] = []
  
  if (outputConfig?.fields && Array.isArray(outputConfig.fields)) {
    // output_config.fields에서 현재 탭에 표시할 필드 필터링
    currentViewFields = outputConfig.fields
      .filter(f => {
        // showIn이 없거나 undefined면 모든 뷰에 표시
        if (!f.showIn || !Array.isArray(f.showIn) || f.showIn.length === 0) {
          return true
        }
        // showIn 배열에 현재 탭이 포함되어 있으면 표시
        return f.showIn.includes(activeTab as ViewType)
      })
      .map(f => f.key)
    
    console.log('[PreviewCard] Using output_config.fields:', {
      activeTab,
      totalFields: outputConfig.fields.length,
      filteredFields: currentViewFields
    })
  } else {
    // output_config가 없으면 기존 로직 사용 (layout_config.views 또는 defaultViews)
    currentViewFields = config.views?.[activeTab as keyof typeof config.views] 
      || defaultViews[activeTab as keyof typeof defaultViews] 
      || []
    
    console.log('[PreviewCard] Using layout_config.views or defaultViews:', {
      activeTab,
      fields: currentViewFields
    })
  }
  
  // 선택지 마커
  const markers = CHOICE_MARKERS[config.choice_marker || 'number_circle']
  
  // 필드 렌더링
  const renderField = (fieldKey: string) => {
    const value = mergedContent[fieldKey]
    if (value === undefined || value === null) return null
    
    switch (fieldKey) {
      case 'passage':
      case 'body':
        return (
          <div key={fieldKey} className="mb-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {String(value)}
            </p>
          </div>
        )
      
      case 'question':
        return (
          <div key={fieldKey} className="mb-3">
            <p className="text-sm font-medium">
              {String(value)}
            </p>
          </div>
        )
      
      case 'choices':
        if (!Array.isArray(value)) return null
        return (
          <div 
            key={fieldKey} 
            className={cn(
              "mb-4",
              config.choice_layout === 'horizontal' 
                ? "flex flex-wrap gap-4" 
                : "space-y-1"
            )}
          >
            {value.map((choice, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "text-sm",
                  config.choice_layout === 'horizontal' && "flex items-center"
                )}
              >
                <span className="font-medium mr-2">{markers[idx] || `${idx + 1}.`}</span>
                <span>{String(choice)}</span>
              </div>
            ))}
          </div>
        )
      
      case 'answer':
        // 정답 뷰에서만 표시
        if (activeTab === 'student') return null
        const answerValue = typeof value === 'number' ? value : parseInt(String(value))
        return (
          <div key={fieldKey} className="mb-3 p-2 bg-green-50 rounded border border-green-200">
            <span className="text-sm font-medium text-green-700">
              정답: {markers[answerValue - 1] || answerValue}
            </span>
          </div>
        )
      
      case 'explanation':
        // 교사 뷰에서만 표시
        if (activeTab !== 'teacher') return null
        
        // explanation이 객체인 경우 (각 선택지별 해설)
        if (typeof value === 'object' && !Array.isArray(value)) {
          return (
            <div key={fieldKey} className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm font-medium text-blue-700 mb-2">해설</p>
              <div className="space-y-2">
                {Object.entries(value as Record<string, string>).map(([key, text]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium">{markers[parseInt(key) - 1] || key}:</span>{' '}
                    <span className="text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        
        // 단순 문자열인 경우
        return (
          <div key={fieldKey} className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-medium text-blue-700 mb-1">해설</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {String(value)}
            </p>
          </div>
        )
      
      default:
        // 기타 필드는 단순 텍스트로 표시
        return (
          <div key={fieldKey} className="mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
              {fieldKey}
            </p>
            <p className="text-sm whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </p>
          </div>
        )
    }
  }
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 뷰 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full rounded-none border-b bg-muted/50">
          <TabsTrigger value="student" className="flex-1 text-xs">
            📄 학생용
          </TabsTrigger>
          <TabsTrigger value="answer" className="flex-1 text-xs">
            ✅ 정답용
          </TabsTrigger>
          <TabsTrigger value="teacher" className="flex-1 text-xs">
            📚 교사용
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="m-0">
          {/* 메타 정보 (순번 > 단원명 > 지문명) */}
          {(sequenceNumber || textbookName || unitName || passageName) && (
            <div className="px-4 pt-3 pb-2 bg-muted/30 border-b">
              <p className="text-xs text-muted-foreground font-mono">
                {sequenceNumber && <span>{sequenceNumber}</span>}
                {textbookName && <span> &gt; {textbookName}</span>}
                {unitName && <span> &gt; {unitName}</span>}
                {passageName && <span> &gt; {passageName}</span>}
              </p>
            </div>
          )}
          
          {/* 콘텐츠 */}
          <div className="p-4">
            {currentViewFields.length > 0 ? (
              currentViewFields.map(fieldKey => renderField(fieldKey))
            ) : (
              // 뷰 설정이 없으면 모든 필드 표시
              Object.keys(mergedContent).map(fieldKey => renderField(fieldKey))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}





