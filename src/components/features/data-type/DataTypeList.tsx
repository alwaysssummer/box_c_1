'use client'

import { Badge } from '@/components/ui/badge'
import { SelectableList } from '@/components/ui/selectable-list'
import { Settings, Sparkles, Database } from 'lucide-react'

export interface DataTypeItem {
  id: string
  name: string
  target: 'passage' | 'sentence'
  has_answer: boolean
  has_dependency: boolean
  dependsOn: string[]
  category?: 'base' | 'analysis' | 'transform' | 'question'
  config?: {
    icon?: string
    description?: string
    noAiRequired?: boolean
  }
}

interface DataTypeListProps {
  dataTypes: DataTypeItem[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (dataType: DataTypeItem) => void
  onAdd: () => void
}

// 기본 데이터 유형인지 확인
function isBaseDataType(dt: DataTypeItem): boolean {
  return dt.category === 'base'
}

export function DataTypeList({
  dataTypes,
  isLoading,
  selectedId,
  onSelect,
  onAdd,
}: DataTypeListProps) {
  // 기본 데이터와 생성 데이터 분리
  const baseDataTypes = dataTypes.filter(isBaseDataType)
  const aiDataTypes = dataTypes.filter(dt => !isBaseDataType(dt))

  // 합쳐서 기본 데이터를 먼저 표시
  const sortedDataTypes = [...baseDataTypes, ...aiDataTypes]

  return (
    <SelectableList
      items={sortedDataTypes}
      isLoading={isLoading}
      selectedId={selectedId}
      onSelect={onSelect}
      onAdd={onAdd}
      emptyIcon={<Settings className="w-8 h-8" />}
      emptyText="등록된 유형이 없습니다"
      addButtonText="데이터 유형 추가"
      getItemId={(dt) => dt.id}
      renderItem={(dt) => {
        const isBase = isBaseDataType(dt)
        
        return (
          <>
            <div className="flex items-center gap-2">
              {isBase ? (
                <Database className="w-4 h-4 text-blue-500" />
              ) : (
                <Sparkles className="w-4 h-4 text-purple-500" />
              )}
              <span className="font-medium text-sm">{dt.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-6">
              {isBase ? (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                  기본 데이터
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-600 border-purple-200">
                  AI 생성
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {dt.target === 'passage' ? '지문' : '문장'}
              </Badge>
              {!isBase && dt.has_answer && (
                <Badge variant="default" className="text-xs">
                  정답有
                </Badge>
              )}
              {dt.has_dependency && (
                <Badge variant="outline" className="text-xs text-orange-600">
                  의존성
                </Badge>
              )}
            </div>
          </>
        )
      }}
    />
  )
}
