'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Search, 
  FileText, 
  Sparkles,
  CheckCircle2,
  Clock,
  FileEdit
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PROMPT_CATEGORIES, PROMPT_STATUS } from '@/types'
import type { Prompt } from '@/types/database'

interface PromptListProps {
  prompts: Prompt[]
  selectedPromptId: string | null
  onSelectPrompt: (prompt: Prompt | null) => void
  onAddNew: () => void
  isLoading?: boolean
}

export function PromptList({
  prompts,
  selectedPromptId,
  onSelectPrompt,
  onAddNew,
  isLoading
}: PromptListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  const filteredPrompts = prompts.filter(prompt => {
    const matchesSearch = !searchQuery || 
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prompt.description?.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = !filterCategory || prompt.category === filterCategory
    const matchesStatus = !filterStatus || prompt.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
      case 'testing':
        return <Clock className="w-3.5 h-3.5 text-yellow-600" />
      default:
        return <FileEdit className="w-3.5 h-3.5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = PROMPT_STATUS.find(s => s.value === status)
    return (
      <Badge variant="secondary" className={cn('text-xs', statusInfo?.color)}>
        {statusInfo?.label || status}
      </Badge>
    )
  }

  const getCategoryLabel = (category: string) => {
    const cat = PROMPT_CATEGORIES.find(c => c.value === category)
    return cat?.label || category
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <h2 className="font-semibold text-lg">프롬프트 라이브러리</h2>
          </div>
          <Button onClick={onAddNew} size="sm" className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-1" />
            새 프롬프트
          </Button>
        </div>

        {/* 검색 */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="프롬프트 검색..."
            className="pl-9"
          />
        </div>

        {/* 필터 */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterCategory || ''}
            onChange={(e) => setFilterCategory(e.target.value || null)}
            className="text-xs border rounded px-2 py-1 bg-white"
          >
            <option value="">모든 카테고리</option>
            {PROMPT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <select
            value={filterStatus || ''}
            onChange={(e) => setFilterStatus(e.target.value || null)}
            className="text-xs border rounded px-2 py-1 bg-white"
          >
            <option value="">모든 상태</option>
            {PROMPT_STATUS.map(st => (
              <option key={st.value} value={st.value}>{st.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 프롬프트 목록 */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full mx-auto mb-2" />
            로딩 중...
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            {prompts.length === 0 ? (
              <>
                <p className="font-medium">프롬프트가 없습니다</p>
                <p className="text-sm mt-1">새 프롬프트를 추가해보세요</p>
              </>
            ) : (
              <>
                <p className="font-medium">검색 결과가 없습니다</p>
                <p className="text-sm mt-1">다른 검색어를 시도해보세요</p>
              </>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredPrompts.map(prompt => (
              <button
                key={prompt.id}
                onClick={() => onSelectPrompt(prompt)}
                className={cn(
                  'w-full text-left p-3 rounded-lg mb-1 transition-colors',
                  'hover:bg-violet-50 border border-transparent',
                  selectedPromptId === prompt.id 
                    ? 'bg-violet-100 border-violet-300' 
                    : 'bg-white'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(prompt.status)}
                    <span className="font-medium truncate">{prompt.name}</span>
                  </div>
                  {getStatusBadge(prompt.status)}
                </div>
                
                {prompt.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 ml-5">
                    {prompt.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 mt-2 ml-5">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(prompt.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {prompt.target === 'passage' ? '지문' : '문장'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* 통계 */}
      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>총 {prompts.length}개 프롬프트</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              {prompts.filter(p => p.status === 'confirmed').length}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-yellow-600" />
              {prompts.filter(p => p.status === 'testing').length}
            </span>
            <span className="flex items-center gap-1">
              <FileEdit className="w-3 h-3 text-gray-500" />
              {prompts.filter(p => p.status === 'draft').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}




