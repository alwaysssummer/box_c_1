'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectableListProps<T> {
  items: T[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (item: T) => void
  onAdd: () => void
  emptyIcon: React.ReactNode
  emptyText: string
  addButtonText: string
  renderItem: (item: T, isSelected: boolean) => React.ReactNode
  getItemId: (item: T) => string
  className?: string
}

export function SelectableList<T>({
  items,
  isLoading,
  selectedId,
  onSelect,
  onAdd,
  emptyIcon,
  emptyText,
  addButtonText,
  renderItem,
  getItemId,
  className,
}: SelectableListProps<T>) {
  return (
    <div className={className}>
      {/* 추가 버튼 */}
      <Button onClick={onAdd} className="w-full mb-2" size="sm">
        <Plus className="w-4 h-4 mr-1" />
        {addButtonText}
      </Button>

      {/* 목록 */}
      <div className="border border-border rounded-md bg-muted/50 max-h-80 overflow-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2">
              {emptyIcon}
            </div>
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </div>
        ) : (
          <div className="py-1">
            {items.map((item) => {
              const id = getItemId(item)
              const isSelected = selectedId === id
              return (
                <div
                  key={id}
                  onClick={() => onSelect(item)}
                  className={cn(
                    'px-3 py-2 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  {renderItem(item, isSelected)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}



