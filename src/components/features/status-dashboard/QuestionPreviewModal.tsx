'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Loader2, Printer, X } from 'lucide-react'
import { UnifiedRenderer } from '@/components/features/output'
import { DEFAULT_OUTPUT_CONFIG, type ViewType } from '@/types/output-config'
import { toast } from 'sonner'

interface QuestionData {
  id: string
  passage_id: string
  question_type_id: string
  instruction: string | null
  body: string | Record<string, unknown> | null
  choices: string | string[] | Record<string, unknown> | null
  answer: string | Record<string, unknown> | null
  explanation: string | Record<string, unknown> | null
  status: string
  question_type?: {
    id: string
    name: string
    output_type?: string
    question_group?: string
    layout_config?: Record<string, unknown>
    output_config?: Record<string, unknown>
  }
  passage?: {
    id: string
    name: string
    content: string | null
    korean_translation?: string | null
  }
}

interface QuestionPreviewModalProps {
  questionId: string | null
  isOpen: boolean
  onClose: () => void
}

export function QuestionPreviewModal({ questionId, isOpen, onClose }: QuestionPreviewModalProps) {
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('student')

  // 문제 데이터 로드
  useEffect(() => {
    if (!questionId || !isOpen) {
      setQuestionData(null)
      return
    }

    const loadQuestion = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/generated-questions/${questionId}`)
        if (!response.ok) throw new Error('Failed to load question')
        
        const data = await response.json()
        setQuestionData(data)
      } catch (error) {
        console.error('Error loading question:', error)
        toast.error('문제를 불러올 수 없습니다')
      } finally {
        setIsLoading(false)
      }
    }

    loadQuestion()
  }, [questionId, isOpen])

  // 인쇄 실행
  const handlePrint = () => {
    window.print()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              👁️ 문제 미리보기
              {questionData && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {questionData.question_type?.name}
                </span>
              )}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-muted-foreground">문제 로딩 중...</span>
          </div>
        ) : questionData ? (
          <div className="flex-1 overflow-auto">
            {/* 탭: 학생용 / 교사용 / 정답만 */}
            <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)} className="mb-4">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="student">📄 학생용 (문제지)</TabsTrigger>
                  <TabsTrigger value="teacher">📚 교사용 (해설)</TabsTrigger>
                  <TabsTrigger value="answer_only">✅ 정답만</TabsTrigger>
                </TabsList>
                
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  인쇄
                </Button>
              </div>

              <TabsContent value={viewType} className="mt-0">
                <UnifiedRenderer
                  mode="preview"
                  viewType={viewType}
                  questions={[
                    {
                      id: questionData.id,
                      passage_id: questionData.passage_id,
                      question_type_id: questionData.question_type_id,
                      passage: questionData.passage?.content || '',
                      korean_translation: questionData.passage?.korean_translation,
                      instruction: questionData.instruction,
                      body: questionData.body,
                      choices: questionData.choices,
                      answer: questionData.answer,
                      explanation: questionData.explanation,
                      metadata: {
                        passage_name: questionData.passage?.name,
                        question_type_name: questionData.question_type?.name,
                      }
                    }
                  ]}
                  outputConfig={
                    questionData.question_type?.output_config as Record<string, unknown> || 
                    DEFAULT_OUTPUT_CONFIG
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            문제를 불러올 수 없습니다
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

