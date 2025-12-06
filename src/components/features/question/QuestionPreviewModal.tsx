'use client'

/**
 * 문제 미리보기 모달 - 공통 컴포넌트
 * 
 * 모든 문제 미리보기에 사용되는 원소스 모달
 * - 문제 관리 상세 패널
 * - 조합 미리보기 (QuestionComposer)
 * - 문제 목록에서 빠른 보기
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  Eye, 
  FileText, 
  Copy, 
  Printer,
  Settings2,
  CheckCircle,
} from 'lucide-react'
import { 
  QuestionRenderer, 
  QuestionData, 
  QuestionLayout, 
  RenderMode,
  renderQuestionToText 
} from './QuestionRenderer'
import { ChoiceMarker } from '@/lib/slot-mapper'
import { QuestionGroup } from '@/lib/slot-system'

// ============================================
// 타입 정의
// ============================================

export interface QuestionPreviewModalProps {
  /** 모달 열림 상태 */
  open: boolean
  
  /** 모달 닫기 콜백 */
  onOpenChange: (open: boolean) => void
  
  /** 문제 데이터 */
  question: QuestionData | null
  
  /** 기본 레이아웃 설정 (question_type에서) */
  defaultLayout?: QuestionLayout
  
  /** 문제 유형 이름 */
  questionTypeName?: string
  
  /** 지문 이름 */
  passageName?: string
  
  /** 문제 번호 */
  questionNumber?: number
  
  /** 레이아웃 편집 허용 여부 */
  allowLayoutEdit?: boolean
}

// ============================================
// 메인 컴포넌트
// ============================================

export function QuestionPreviewModal({
  open,
  onOpenChange,
  question,
  defaultLayout = {},
  questionTypeName,
  passageName,
  questionNumber,
  allowLayoutEdit = true,
}: QuestionPreviewModalProps) {
  // 레이아웃 설정 상태
  const [choiceMarker, setChoiceMarker] = useState<ChoiceMarker>(
    defaultLayout.choiceMarker || 'circle'
  )
  const [choiceLayout, setChoiceLayout] = useState<'vertical' | 'horizontal' | 'grid2'>(
    defaultLayout.choiceLayout || 'vertical'
  )
  const [showAnswer, setShowAnswer] = useState(true)
  const [showExplanation, setShowExplanation] = useState(true)
  const [mode, setMode] = useState<RenderMode>('preview')
  
  // 현재 레이아웃
  const currentLayout: QuestionLayout = {
    choiceMarker,
    choiceLayout,
    questionGroup: defaultLayout.questionGroup || 'practical',
  }

  // 텍스트 복사
  const handleCopy = () => {
    if (!question) return
    
    const text = renderQuestionToText(question, currentLayout, {
      showAnswer,
      showExplanation,
      questionNumber,
    })
    
    navigator.clipboard.writeText(text)
    toast.success('클립보드에 복사되었습니다')
  }

  // 인쇄
  const handlePrint = () => {
    window.print()
  }

  if (!question) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-violet-600" />
            문제 미리보기
          </DialogTitle>
          
          {/* 메타 정보 */}
          <div className="flex items-center gap-2 flex-wrap">
            {questionTypeName && (
              <Badge variant="secondary" className="text-xs">
                {questionTypeName}
              </Badge>
            )}
            {passageName && (
              <Badge variant="outline" className="text-xs">
                📄 {passageName}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* 탭 */}
        <Tabs defaultValue="preview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              미리보기
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings2 className="w-4 h-4" />
              출력 설정
            </TabsTrigger>
          </TabsList>

          {/* 미리보기 탭 */}
          <TabsContent value="preview" className="flex-1 overflow-auto mt-4">
            <div className="p-4 border rounded-lg bg-white min-h-[300px]">
              <QuestionRenderer
                question={question}
                layout={currentLayout}
                mode={mode}
                showAnswer={showAnswer}
                showExplanation={showExplanation}
                questionNumber={questionNumber}
              />
            </div>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings" className="flex-1 overflow-auto mt-4">
            <div className="space-y-6 p-4 border rounded-lg bg-muted/30">
              {/* 모드 선택 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">출력 모드</label>
                <div className="flex gap-2">
                  {[
                    { value: 'preview', label: '미리보기', icon: Eye },
                    { value: 'student', label: '학생용', icon: FileText },
                    { value: 'answer', label: '정답지', icon: CheckCircle },
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={mode === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMode(value as RenderMode)}
                      className="flex-1"
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 레이아웃 설정 */}
              {allowLayoutEdit && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {/* 마커 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">선택지 마커</label>
                      <Select 
                        value={choiceMarker} 
                        onValueChange={(v) => setChoiceMarker(v as ChoiceMarker)}
                      >
                        <SelectTrigger>
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

                    {/* 배치 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">선택지 배치</label>
                      <Select 
                        value={choiceLayout} 
                        onValueChange={(v) => setChoiceLayout(v as 'vertical' | 'horizontal' | 'grid2')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vertical">세로 (한 줄씩)</SelectItem>
                          <SelectItem value="horizontal">가로 (한 줄)</SelectItem>
                          <SelectItem value="grid2">2열 그리드</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* 표시 옵션 */}
              <div className="space-y-3">
                <label className="text-sm font-medium">표시 옵션</label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={showAnswer}
                      onCheckedChange={(checked) => setShowAnswer(checked === true)}
                    />
                    <span className="text-sm">정답 표시</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={showExplanation}
                      onCheckedChange={(checked) => setShowExplanation(checked === true)}
                    />
                    <span className="text-sm">해설 표시</span>
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-1" />
            복사
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />
            인쇄
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuestionPreviewModal

