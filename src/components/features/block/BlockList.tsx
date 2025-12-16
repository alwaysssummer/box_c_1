'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Layers,
  MoreVertical,
  FileText,
  AlignJustify
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BlockDefinition } from '@/types/database'

interface BlockListProps {
  blocks: BlockDefinition[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (block: BlockDefinition) => void
  onAdd: () => void
  onDelete: (id: string) => Promise<void>
}

export function BlockList({ 
  blocks, 
  isLoading, 
  selectedId,
  onSelect, 
  onAdd, 
  onDelete 
}: BlockListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('이 블록 정의를 삭제하시겠습니까?')) return
    
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }
  
  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">블록 정의</h3>
        <Button onClick={onAdd} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-1" />
          추가
        </Button>
      </div>
      
      {/* 목록 */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            로딩 중...
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">등록된 블록이 없습니다</p>
            <Button onClick={onAdd} variant="link" size="sm" className="mt-2">
              첫 번째 블록 만들기
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {blocks.map((block) => (
              <div
                key={block.id}
                onClick={() => onSelect(block)}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-colors border",
                  selectedId === block.id
                    ? "bg-primary/10 border-primary"
                    : "bg-card hover:bg-muted/50 border-transparent",
                  deletingId === block.id && "opacity-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                      block.type === 'single' 
                        ? "bg-gray-100 text-gray-600"
                        : "bg-purple-100 text-purple-600"
                    )}>
                      {block.type === 'single' ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <Layers className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{block.label}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded",
                          block.unit === 'passage' 
                            ? "bg-blue-100 text-blue-600"
                            : "bg-orange-100 text-orange-600"
                        )}>
                          {block.unit === 'passage' ? '지문' : '문장'}
                        </span>
                        {block.output_fields && block.output_fields.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            필드 {block.output_fields.length}개
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelect(block)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(e as unknown as React.MouseEvent, block.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}








