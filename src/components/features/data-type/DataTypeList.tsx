'use client'

import { Badge } from '@/components/ui/badge'
import { SelectableList } from '@/components/ui/selectable-list'
import { Settings } from 'lucide-react'

export interface DataTypeItem {
  id: string
  name: string
  target: 'passage' | 'sentence'
  has_answer: boolean
  has_dependency: boolean
  dependsOn: string[]
}

interface DataTypeListProps {
  dataTypes: DataTypeItem[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (dataType: DataTypeItem) => void
  onAdd: () => void
}

export function DataTypeList({
  dataTypes,
  isLoading,
  selectedId,
  onSelect,
  onAdd,
}: DataTypeListProps) {
  return (
    <SelectableList
      items={dataTypes}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onAdd={onAdd}
      emptyIcon={<Settings className="w-8 h-8" />}
      emptyText="등록된 유형이 없습니다"
      addButtonText="데이터 유형 추가"
      getItemId={(dt) => dt.id}
      renderItem={(dt) => (
        <>
          <div className="font-medium text-sm">{dt.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {dt.target === 'passage' ? '지문' : '문장'}
            </Badge>
            <Badge 
              variant={dt.has_answer ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {dt.has_answer ? '정답有' : '자료형'}
            </Badge>
            {dt.has_dependency && (
              <Badge variant="outline" className="text-xs text-orange-600">
                의존성
              </Badge>
            )}
          </div>
        </>
      )}
    />
  )
}
