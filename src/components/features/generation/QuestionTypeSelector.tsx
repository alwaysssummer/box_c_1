'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { 
  FileText, 
  BookOpen, 
  Layers,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import type { QuestionTypeWithBlocks } from '@/types/database'

// 문제 그룹 정의
const QUESTION_GROUPS = [
  { value: 'csat', label: '수능형', icon: FileText, color: 'blue' },
  { value: 'school_passage', label: '내신-지문단위', icon: FileText, color: 'purple' },
  { value: 'school_sentence', label: '내신-문장단위', icon: FileText, color: 'orange' },
  { value: 'study', label: '자습서', icon: BookOpen, color: 'green' },
]

interface QuestionTypeSelectorProps {
  selectedId: string | null
  onSelect: (questionType: QuestionTypeWithBlocks | null) => void
}

export function QuestionTypeSelector({ selectedId, onSelect }: QuestionTypeSelectorProps) {
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeWithBlocks[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['csat', 'school_passage']))
  
  // 문제 유형 목록 로드
  useEffect(() => {
    const fetchQuestionTypes = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/question-types')
        if (response.ok) {
          const data = await response.json()
          setQuestionTypes(data)
        }
      } catch (error) {
        console.error('Failed to fetch question types:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchQuestionTypes()
  }, [])
  
  // 그룹 토글
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }
  
  // 그룹별로 분류
  const groupedTypes = QUESTION_GROUPS.map(group => ({
    ...group,
    types: questionTypes.filter(qt => 
      (qt.question_group || 'csat') === group.value
    )
  }))
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  if (questionTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Layers className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">등록된 문제 유형이 없습니다</p>
        <p className="text-xs mt-1">설정에서 문제 유형을 먼저 생성하세요</p>
      </div>
    )
  }
  
  return (
    <div className="divide-y">
      {groupedTypes.map(group => (
        <div key={group.value}>
          {/* 그룹 헤더 */}
          <button
            onClick={() => toggleGroup(group.value)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <group.icon className={cn(
                "w-4 h-4",
                group.color === 'blue' && "text-blue-500",
                group.color === 'purple' && "text-purple-500",
                group.color === 'orange' && "text-orange-500",
                group.color === 'green' && "text-green-500",
              )} />
              <span className="text-sm font-medium">{group.label}</span>
              <span className="text-xs text-muted-foreground">
                ({group.types.length})
              </span>
            </div>
            {expandedGroups.has(group.value) ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {/* 그룹 내 문제 유형 목록 */}
          {expandedGroups.has(group.value) && group.types.length > 0 && (
            <div className="bg-muted/30">
              {group.types.map(qt => (
                <button
                  key={qt.id}
                  onClick={() => onSelect(selectedId === qt.id ? null : qt)}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-2 text-left transition-colors",
                    selectedId === qt.id 
                      ? "bg-blue-50 border-l-2 border-blue-500" 
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    qt.output_type === 'question' ? "bg-blue-500" : "bg-green-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      selectedId === qt.id && "font-medium"
                    )}>
                      {qt.name}
                    </p>
                    {qt.blocks && qt.blocks.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        블록: {qt.blocks.map(b => b.label).join(', ')}
                      </p>
                    )}
                  </div>
                  {selectedId === qt.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          
          {/* 그룹이 비어있을 때 */}
          {expandedGroups.has(group.value) && group.types.length === 0 && (
            <div className="px-6 py-3 text-xs text-muted-foreground bg-muted/30">
              이 그룹에 등록된 유형이 없습니다
            </div>
          )}
        </div>
      ))}
    </div>
  )
}








