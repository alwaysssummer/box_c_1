'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Save,
  X,
  Sparkles,
  FileText,
  Trash2,
  Edit,
  ArrowLeft,
} from 'lucide-react'
import { GROUP_INFO, type QuestionGroup } from '@/lib/slot-system'

// 원큐 폼 데이터
export interface PromptBasedFormData {
  id?: string | null
  name: string
  promptId: string | null
  instruction: string | null
  questionGroup: QuestionGroup | null
  choiceLayout?: string
  choiceMarker?: string
}

// 기존 데이터 형식 (편집 시)
interface ExistingData {
  id: string
  name: string
  prompt_id: string | null
  instruction: string | null
  choice_layout: string | null
  choice_marker: string | null
  question_group: string | null
}

// 프롬프트 아이템 형식
interface PromptItem {
  id: string
  name: string
  category: string | null
  question_group?: string | null
  status: string | null
}

interface PromptBasedFormProps {
  existingData: ExistingData | null
  allPrompts: PromptItem[]
  isEditing: boolean
  onSave: (data: PromptBasedFormData) => Promise<void>
  onDelete?: () => Promise<void>
  onEdit?: () => void
  onCancel: () => void
  onBack?: () => void
}

export function PromptBasedForm({
  existingData,
  allPrompts,
  isEditing,
  onSave,
  onDelete,
  onEdit,
  onCancel,
  onBack,
}: PromptBasedFormProps) {
  const [formData, setFormData] = useState<PromptBasedFormData>({
    id: null,
    name: '',
    promptId: null,
    instruction: '',
    questionGroup: null,
    choiceLayout: 'vertical',
    choiceMarker: 'circle',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 선택된 프롬프트 정보
  const selectedPrompt = allPrompts.find(p => p.id === formData.promptId)
  
  // 프롬프트 필터 (generation 카테고리만)
  const generationPrompts = allPrompts.filter(p => p.category === 'generation')

  useEffect(() => {
    if (existingData) {
      setFormData({
        id: existingData.id,
        name: existingData.name,
        promptId: existingData.prompt_id,
        instruction: existingData.instruction || '',
        questionGroup: (existingData.question_group as QuestionGroup) || null,
        choiceLayout: existingData.choice_layout || 'vertical',
        choiceMarker: existingData.choice_marker || 'circle',
      })
    } else {
      setFormData({
        id: null,
        name: '',
        promptId: null,
        instruction: '',
        questionGroup: null,
        choiceLayout: 'vertical',
        choiceMarker: 'circle',
      })
    }
  }, [existingData])

  // 프롬프트 선택 시 question_group 자동 설정
  const handlePromptChange = (promptId: string) => {
    const prompt = allPrompts.find(p => p.id === promptId)
    setFormData(prev => ({
      ...prev,
      promptId,
      questionGroup: (prompt?.question_group as QuestionGroup) || 'practical',
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.promptId || isSaving) return
    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return
    if (confirm(`"${formData.name}" 문제 유형을 삭제하시겠습니까?`)) {
      setIsDeleting(true)
      try {
        await onDelete()
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const groupInfo = formData.questionGroup ? GROUP_INFO[formData.questionGroup] : null

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="mr-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="p-1.5 bg-blue-500 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold">프롬프트 원큐</h2>
          {existingData && (
            <Badge variant="outline" className="ml-2">
              {isEditing ? '수정 중' : '조회'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          프롬프트가 완성된 문제를 직접 생성합니다. 설정 항목 3개로 간편하게!
        </p>
      </div>

      {/* 폼 본문 */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-xl mx-auto space-y-6">
          {/* 1. 유형명 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">1</span>
              유형명
              <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!isEditing}
              placeholder="예: 제목 추론, 빈칸 추론"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              문제 유형을 구분하는 이름입니다
            </p>
          </div>

          {/* 2. 프롬프트 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">2</span>
              프롬프트 선택
              <span className="text-destructive">*</span>
            </label>
            <Select
              value={formData.promptId || ''}
              onValueChange={handlePromptChange}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="프롬프트를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {generationPrompts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    생성용 프롬프트가 없습니다.
                    <br />
                    설정 &gt; 프롬프트에서 먼저 추가하세요.
                  </div>
                ) : (
                  generationPrompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{prompt.name}</span>
                        {prompt.question_group && (
                          <Badge variant="outline" className="text-xs">
                            {GROUP_INFO[prompt.question_group as QuestionGroup]?.label || prompt.question_group}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            
            {/* 선택된 프롬프트 정보 */}
            {selectedPrompt && groupInfo && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedPrompt.name}
                  </span>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {groupInfo.icon} {groupInfo.label}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* 3. 지시문 (선택사항) */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">3</span>
              지시문
              <span className="text-xs text-muted-foreground ml-1">(선택)</span>
            </label>
            <Textarea
              value={formData.instruction || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, instruction: e.target.value }))}
              disabled={!isEditing}
              placeholder="예: 다음 글의 제목으로 가장 적절한 것은?"
              className="min-h-[80px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              비워두면 AI가 적절한 지시문을 자동 생성합니다
            </p>
          </div>

          {/* 그룹 정보 (읽기 전용) */}
          {groupInfo && (
            <div className="p-4 bg-slate-50 rounded-lg border">
              <h4 className="text-sm font-medium mb-2">자동 설정 (프롬프트 기반)</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">그룹:</span>
                  <span className="ml-2 font-medium">{groupInfo.icon} {groupInfo.label}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">정답:</span>
                  <span className="ml-2">
                    {formData.questionGroup === 'analysis' || formData.questionGroup === 'vocabulary' 
                      ? '없음 (학습자료)' 
                      : '있음'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="border-t p-4 bg-muted/30">
        <div className="max-w-xl mx-auto flex gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.promptId || isSaving}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                저장
              </Button>
              <Button onClick={onCancel} variant="outline" className="flex-1">
                <X className="w-4 h-4 mr-2" />
                취소
              </Button>
            </>
          ) : (
            <>
              {onEdit && (
                <Button onClick={onEdit} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  수정
                </Button>
              )}
              {onDelete && (
                <Button 
                  onClick={handleDelete} 
                  variant="destructive" 
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  삭제
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
