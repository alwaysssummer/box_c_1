'use client'

/**
 * 문제 미리보기 모달 - 공통 컴포넌트
 * 
 * QuestionRenderer를 모달로 감싸서 미리보기 제공
 * 레이아웃 설정 변경 가능
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuestionRenderer, QuestionData, QuestionLayout, RenderMode } from './QuestionRenderer'
import { ChoiceMarker } from '@/lib/slot-mapper'
import { QuestionGroup, GROUP_INFO } from '@/lib/slot-system'

export interface QuestionPreviewModalProps {
  /** 모달 열림 상태 */
  open: boolean
  
  /** 모달 상태 변경 */
  onOpenChange: (open: boolean) => void
  
  /** 문제 데이터 */
  question: QuestionData | null
  
  /** 기본 레이아웃 설정 */
  defaultLayout?: QuestionLayout
  
  /** 문제 유형명 */
  questionTypeName?: string
  
  /** 지문명 */
  passageName?: string
}

export function QuestionPreviewModal({
  open,
  onOpenChange,
  question,
  defaultLayout = {},
  questionTypeName,
  passageName,
}: QuestionPreviewModalProps) {
  // 레이아웃 설정 상태
  const [choiceMarker, setChoiceMarker] = useState<ChoiceMarker>(
    defaultLayout.choiceMarker || 'circle'
  )
  const [choiceLayout, setChoiceLayout] = useState<'vertical' | 'horizontal' | 'grid2'>(
    defaultLayout.choiceLayout || 'vertical'
  )
  const [mode, setMode] = useState<RenderMode>('preview')
  const [showAnswer, setShowAnswer] = useState(true)
  const [showExplanation, setShowExplanation] = useState(true)

  const questionGroup = defaultLayout.questionGroup || 'practical'
  const groupInfo = GROUP_INFO[questionGroup]

  if (!question) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>📝 문제 미리보기</span>
            {questionTypeName && (
              <Badge variant="outline">{questionTypeName}</Badge>
            )}
            {passageName && (
              <Badge variant="secondary">{passageName}</Badge>
            )}
            {groupInfo && (
              <Badge className="bg-primary/10 text-primary">
                {groupInfo.icon} {groupInfo.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">미리보기</TabsTrigger>
            <TabsTrigger value="settings">출력 설정</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <div className="p-4 border rounded-lg bg-white">
              <QuestionRenderer
                question={question}
                layout={{
                  choiceMarker,
                  choiceLayout,
                  questionGroup,
                }}
                mode={mode}
                showAnswer={showAnswer}
                showExplanation={showExplanation}
              />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              {/* 렌더링 모드 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">렌더링 모드</label>
                <div className="flex gap-2">
                  {(['preview', 'print', 'student', 'answer'] as RenderMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-1 text-sm rounded ${
                        mode === m
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {m === 'preview' ? '미리보기' :
                       m === 'print' ? '인쇄' :
                       m === 'student' ? '학생용' : '정답지'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 선택지 마커 */}
              {questionGroup !== 'analysis' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">선택지 마커</label>
                  <Select value={choiceMarker} onValueChange={(v) => setChoiceMarker(v as ChoiceMarker)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">① ② ③ ④ ⑤</SelectItem>
                      <SelectItem value="number">1. 2. 3. 4. 5.</SelectItem>
                      <SelectItem value="alpha">A. B. C. D. E.</SelectItem>
                      <SelectItem value="paren">(1) (2) (3) (4) (5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 선택지 배열 */}
              {questionGroup !== 'analysis' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">선택지 배열</label>
                  <Select value={choiceLayout} onValueChange={(v) => setChoiceLayout(v as 'vertical' | 'horizontal' | 'grid2')}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vertical">세로형</SelectItem>
                      <SelectItem value="horizontal">가로형</SelectItem>
                      <SelectItem value="grid2">2열 그리드</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 정답/해설 표시 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">표시 옵션</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showAnswer}
                      onChange={(e) => setShowAnswer(e.target.checked)}
                      className="rounded"
                    />
                    정답 표시
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showExplanation}
                      onChange={(e) => setShowExplanation(e.target.checked)}
                      className="rounded"
                    />
                    해설 표시
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
