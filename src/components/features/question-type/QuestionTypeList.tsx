'use client'

import { Badge } from '@/components/ui/badge'
import { SelectableList } from '@/components/ui/selectable-list'
import { BookOpen } from 'lucide-react'

export interface QuestionTypeItem {
  id: string
  name: string
  instruction: string | null
  choice_layout: string
  choice_marker: string
  question_group?: string  // 문제 유형 그룹
  prompt_id?: string | null  // 프롬프트 직접 연결
  dataTypeList: {
    id: string
    dataTypeId: string
    dataTypeName: string
    role: string
  }[]
}

interface QuestionTypeListProps {
  questionTypes: QuestionTypeItem[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (questionType: QuestionTypeItem) => void
  onAdd: () => void
}

export function QuestionTypeList({
  questionTypes,
  isLoading,
  selectedId,
  onSelect,
  onAdd,
}: QuestionTypeListProps) {
  // 프롬프트 기반과 슬롯 기반 분리
  const promptBased = questionTypes.filter(qt => qt.prompt_id)
  const slotBased = questionTypes.filter(qt => !qt.prompt_id)
  
  // 정렬: 프롬프트 기반 먼저, 그 다음 슬롯 기반
  const sortedTypes = [...promptBased, ...slotBased]

  return (
    <SelectableList
      items={sortedTypes}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onAdd={onAdd}
      emptyIcon={<BookOpen className="w-8 h-8" />}
      emptyText="등록된 문제 유형이 없습니다"
      addButtonText="+ 문제 유형 추가"
      getItemId={(qt) => qt.id}
      renderItem={(qt) => (
        <>
          <div className="flex items-center gap-2">
            <span className="text-sm">{qt.prompt_id ? '🚀' : '🧩'}</span>
            <span className="font-medium text-sm">{qt.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {qt.prompt_id ? (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                프롬프트 기반
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                {qt.dataTypeList.length}개 데이터 유형
              </Badge>
            )}
          </div>
        </>
      )}
    />
  )
}
