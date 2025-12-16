'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  BookOpen,
  Layers,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { QuestionTypeWithBlocks } from '@/types/database'

// 문제 그룹 라벨
const QUESTION_GROUP_LABELS: Record<string, string> = {
  csat: '수능형',
  school_passage: '내신-지문',
  school_sentence: '내신-문장',
  study: '자습서',
}

interface QuestionTypeListProps {
  questionTypes: QuestionTypeWithBlocks[]
  isLoading: boolean
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => Promise<void>
}

export function QuestionTypeList({ 
  questionTypes, 
  isLoading, 
  onAdd, 
  onEdit, 
  onDelete 
}: QuestionTypeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const handleDelete = async (id: string) => {
    if (!confirm('이 문제 유형을 삭제하시겠습니까?')) return
    
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }
  
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">문제 유형 목록</h2>
        <Button onClick={onAdd} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          새 유형 추가
        </Button>
      </div>
      
      {/* 목록 */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">
          로딩 중...
        </div>
      ) : questionTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>등록된 문제 유형이 없습니다.</p>
            <Button onClick={onAdd} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-1" />
              첫 번째 유형 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questionTypes.map((qt) => (
            <Card 
              key={qt.id} 
              className={cn(
                "transition-colors hover:bg-gray-50",
                deletingId === qt.id && "opacity-50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* 아이콘 */}
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      qt.output_type === 'question' 
                        ? "bg-blue-100 text-blue-600"
                        : "bg-green-100 text-green-600"
                    )}>
                      {qt.output_type === 'question' ? (
                        <FileText className="w-5 h-5" />
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </div>
                    
                    {/* 정보 */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{qt.name}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          qt.output_type === 'question'
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-600"
                        )}>
                          {qt.output_type === 'question' ? '문제형' : '자습서형'}
                        </span>
                        {qt.question_group && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {QUESTION_GROUP_LABELS[qt.question_group] || qt.question_group}
                          </span>
                        )}
                      </div>
                      
                      {/* 블록 정보 */}
                      {qt.blocks && qt.blocks.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Layers className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {qt.blocks.map(b => b.label).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(qt.id)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(qt.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}








