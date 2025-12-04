'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div>
      {/* 추가 버튼 */}
      <Button onClick={onAdd} className="w-full mb-2" size="sm">
        <Plus className="w-4 h-4 mr-1" />
        문제 유형 추가
      </Button>

      {/* 목록 */}
      <div className="border border-border rounded-md bg-muted/50 max-h-80 overflow-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : questionTypes.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              등록된 문제 유형이 없습니다
            </p>
          </div>
        ) : (
          <div className="py-1">
            {questionTypes.map((qt) => (
              <div
                key={qt.id}
                onClick={() => onSelect(qt)}
                className={cn(
                  'px-3 py-2 cursor-pointer transition-colors',
                  selectedId === qt.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <div className="font-medium text-sm">{qt.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {qt.dataTypeList.length}개 데이터 유형
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




