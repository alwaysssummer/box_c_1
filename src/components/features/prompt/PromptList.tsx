'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Loader2, Sparkles, Puzzle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Prompt } from '@/types/database'

interface PromptListProps {
  prompts: Prompt[]
  isLoading: boolean
  selectedPromptId: string | null
  onSelectPrompt: (prompt: Prompt) => void
  onAddOneClick: () => void
  onAddSlot: () => void
}

export function PromptList({
  prompts,
  isLoading,
  selectedPromptId,
  onSelectPrompt,
  onAddOneClick,
  onAddSlot,
}: PromptListProps) {
  // 원큐용과 슬롯용 분리
  const oneClickPrompts = prompts.filter(p => 
    (p as unknown as { is_question_type?: boolean }).is_question_type === true
  )
  const slotPrompts = prompts.filter(p => 
    (p as unknown as { is_question_type?: boolean }).is_question_type !== true
  )

  return (
    <div>
      {/* 추가 버튼 - 원큐/슬롯 분리 */}
      <div className="flex gap-2 mb-3">
        <Button 
          onClick={onAddOneClick} 
          className="flex-1 bg-blue-500 hover:bg-blue-600" 
          size="sm"
        >
          <Sparkles className="w-4 h-4 mr-1" />
          🚀 원큐
        </Button>
        <Button 
          onClick={onAddSlot} 
          variant="outline"
          className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50" 
          size="sm"
        >
          <Puzzle className="w-4 h-4 mr-1" />
          🧩 슬롯
        </Button>
      </div>

      {/* 목록 */}
      <div className="border border-border rounded-md bg-muted/50 max-h-[calc(100vh-300px)] overflow-auto">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : prompts.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">등록된 프롬프트가 없습니다</p>
          </div>
        ) : (
          <div className="py-1">
            {/* 원큐용 프롬프트 */}
            {oneClickPrompts.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border-b">
                  🚀 원큐용 ({oneClickPrompts.length})
                </div>
                {oneClickPrompts.map((prompt) => {
                  const isSelected = selectedPromptId === prompt.id
                  return (
                    <div
                      key={prompt.id}
                      onClick={() => onSelectPrompt(prompt)}
                      className={cn(
                        'px-3 py-2 cursor-pointer transition-colors border-l-2',
                        isSelected
                          ? 'bg-blue-50 text-blue-700 border-l-blue-500'
                          : 'border-l-transparent hover:bg-muted'
                      )}
                    >
                      <div className="font-medium text-sm truncate">{prompt.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                          {prompt.category}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* 슬롯용 프롬프트 */}
            {slotPrompts.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 border-b border-t">
                  🧩 슬롯용 ({slotPrompts.length})
                </div>
                {slotPrompts.map((prompt) => {
                  const isSelected = selectedPromptId === prompt.id
                  return (
                    <div
                      key={prompt.id}
                      onClick={() => onSelectPrompt(prompt)}
                      className={cn(
                        'px-3 py-2 cursor-pointer transition-colors border-l-2',
                        isSelected
                          ? 'bg-purple-50 text-purple-700 border-l-purple-500'
                          : 'border-l-transparent hover:bg-muted'
                      )}
                    >
                      <div className="font-medium text-sm truncate">{prompt.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {prompt.category}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
