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
  return (
    <SelectableList
      items={questionTypes}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onAdd={onAdd}
      emptyIcon={<BookOpen className="w-8 h-8" />}
      emptyText="등록된 문제 유형이 없습니다"
      addButtonText="문제 유형 추가"
      getItemId={(qt) => qt.id}
      renderItem={(qt) => (
        <>
          <div className="font-medium text-sm">{qt.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {qt.dataTypeList.length}개 데이터 유형
            </Badge>
          </div>
        </>
      )}
    />
  )
}
