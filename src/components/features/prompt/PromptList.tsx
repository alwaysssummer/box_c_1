'use client'

import { Badge } from '@/components/ui/badge'
import { SelectableList } from '@/components/ui/selectable-list'
import { FileText } from 'lucide-react'
import type { Prompt } from '@/types/database'

interface PromptListProps {
  prompts: Prompt[]
  isLoading: boolean
  selectedPromptId: string | null
  onSelectPrompt: (prompt: Prompt) => void
  onAddNew: () => void
}

export function PromptList({
  prompts,
  isLoading,
  selectedPromptId,
  onSelectPrompt,
  onAddNew,
}: PromptListProps) {
  return (
    <SelectableList
      items={prompts}
      isLoading={isLoading}
      selectedId={selectedPromptId}
      onSelect={onSelectPrompt}
      onAdd={onAddNew}
      emptyIcon={<FileText className="w-8 h-8" />}
      emptyText="등록된 프롬프트가 없습니다"
      addButtonText="프롬프트 추가"
      getItemId={(p) => p.id}
      renderItem={(p) => (
        <>
          <div className="font-medium text-sm truncate">{p.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {p.category}
            </Badge>
            <Badge 
              variant={p.status === 'confirmed' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {p.status === 'confirmed' ? '확정' : p.status === 'testing' ? '테스트' : '초안'}
            </Badge>
          </div>
        </>
      )}
    />
  )
}
