'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Settings, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div>
      {/* 추가 버튼 */}
      <Button onClick={onAdd} className="w-full mb-2" size="sm">
        <Plus className="w-4 h-4 mr-1" />
        데이터 유형 추가
      </Button>

      {/* 목록 */}
      <div className="border border-border rounded-md bg-muted/50 max-h-80 overflow-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : dataTypes.length === 0 ? (
          <div className="py-8 text-center">
            <Settings className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              등록된 유형이 없습니다
            </p>
          </div>
        ) : (
          <div className="py-1">
            {dataTypes.map((dt) => (
              <div
                key={dt.id}
                onClick={() => onSelect(dt)}
                className={cn(
                  'px-3 py-2 cursor-pointer transition-colors',
                  selectedId === dt.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




