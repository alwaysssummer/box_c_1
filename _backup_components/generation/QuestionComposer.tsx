'use client'

/**
 * 출제 2단계 시스템 - 2단계: 문제 조합 UI
 * 
 * 검증된 슬롯 데이터를 템플릿에 매핑하여 문제 조합/미리보기
 */

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MappedQuestion,
  BatchMappingResult,
  batchMapDataToTemplate,
  renderQuestionAsText,
  renderAnalysisAsText,
  QuestionTemplate,
  ChoiceMarker,
} from '@/lib/slot-mapper'
import { QuestionGroup, GROUP_INFO, getSlotLabel } from '@/lib/slot-system'
import { Eye, FileText, CheckCircle } from 'lucide-react'
import { QuestionRenderer, QuestionPreviewModal, QuestionData, QuestionLayout } from '@/components/features/question'

interface QuestionComposerProps {
  /** 문제 유형 정보 */
  template: QuestionTemplate
  
  /** 지문별 슬롯 데이터 */
  passageSlotDataList: Array<{
    passageId: string
    passageName: string
    slotData: Record<string, unknown>
  }>
  
  /** 조합 완료 콜백 */
  onCompose?: (result: BatchMappingResult) => void
  
  /** 저장 콜백 */
  onSave?: (questions: MappedQuestion[]) => Promise<void>
}

export function QuestionComposer({
  template,
  passageSlotDataList,
  onCompose,
  onSave,
}: QuestionComposerProps) {
  const [mappingResult, setMappingResult] = useState<BatchMappingResult | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<MappedQuestion | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [choiceMarker, setChoiceMarker] = useState<ChoiceMarker>('circle')
  const [choiceLayout, setChoiceLayout] = useState<'vertical' | 'horizontal' | 'grid2'>('vertical')
  const [includeAnswer, setIncludeAnswer] = useState(true)
  const [includeExplanation, setIncludeExplanation] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 초기 매핑 실행
  useEffect(() => {
    if (passageSlotDataList.length > 0) {
      const result = batchMapDataToTemplate(passageSlotDataList, template)
      setMappingResult(result)
      onCompose?.(result)
    }
  }, [passageSlotDataList, template, onCompose])

  // 문제 미리보기 열기
  const openPreview = (question: MappedQuestion) => {
    setSelectedQuestion(question)
    setPreviewOpen(true)
  }

  // 저장 처리
  const handleSave = async () => {
    if (!mappingResult || !onSave) return
    
    setIsSaving(true)
    try {
      await onSave(mappingResult.questions)
    } finally {
      setIsSaving(false)
    }
  }

  // 렌더링 함수
  const renderPreview = (question: MappedQuestion): string => {
    if (template.group === 'analysis') {
      return renderAnalysisAsText(question, {
        includeVocabulary: true,
        includeGrammar: true,
      })
    }
    
    return renderQuestionAsText(question, {
      includeAnswer,
      includeExplanation,
      choiceMarker,
      choiceLayout,
    })
  }

  if (!mappingResult) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          문제 조합을 준비 중입니다...
        </CardContent>
      </Card>
    )
  }

  const groupInfo = GROUP_INFO[template.group]

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{groupInfo?.icon}</span>
            문제 조합
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {mappingResult.successful}/{mappingResult.total} 성공
            </Badge>
            {onSave && mappingResult.successful > 0 && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {template.name} | {groupInfo?.label}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 출력 옵션 */}
        {template.group !== 'analysis' && (
          <div className="flex flex-wrap gap-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm">마커:</span>
              <Select value={choiceMarker} onValueChange={(v) => setChoiceMarker(v as ChoiceMarker)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">① ② ③</SelectItem>
                  <SelectItem value="number">1. 2. 3.</SelectItem>
                  <SelectItem value="alpha">A. B. C.</SelectItem>
                  <SelectItem value="paren">(1) (2) (3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">배치:</span>
              <Select value={choiceLayout} onValueChange={(v) => setChoiceLayout(v as 'vertical' | 'horizontal' | 'grid2')}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">세로</SelectItem>
                  <SelectItem value="horizontal">가로</SelectItem>
                  <SelectItem value="grid2">2열</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeAnswer}
                onChange={(e) => setIncludeAnswer(e.target.checked)}
                className="rounded"
              />
              정답 포함
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeExplanation}
                onChange={(e) => setIncludeExplanation(e.target.checked)}
                className="rounded"
              />
              해설 포함
            </label>
          </div>
        )}

        {/* 매핑 실패 목록 */}
        {mappingResult.errors.length > 0 && (
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-sm font-medium text-red-700 mb-2">
              ❌ 조합 실패 ({mappingResult.errors.length}개)
            </div>
            <div className="text-sm text-red-600 space-y-1">
              {mappingResult.errors.map((err, i) => (
                <div key={i}>• {err.error}</div>
              ))}
            </div>
          </div>
        )}

        {/* 조합된 문제 목록 */}
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">목록 ({mappingResult.successful})</TabsTrigger>
            <TabsTrigger value="preview">전체 미리보기</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-4">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {mappingResult.questions.map((question, index) => (
                <div
                  key={question.meta.passageId}
                  className="flex items-center justify-between p-3 border rounded hover:bg-muted"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {index + 1}. {question.meta.passageName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      슬롯: {Object.keys(question.slots).map(s => getSlotLabel(s as any)).join(', ')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openPreview(question)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    미리보기
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <div className="space-y-6 max-h-96 overflow-y-auto p-4 bg-white border rounded-lg">
              {mappingResult.questions.map((question, index) => (
                <div key={question.meta.passageId} className="pb-6 border-b last:border-b-0">
                  <div className="text-xs text-muted-foreground mb-2">
                    #{index + 1} - {question.meta.passageName}
                  </div>
                  {/* 공통 QuestionRenderer 사용 */}
                  <QuestionRenderer
                    question={{
                      instruction: question.slots.instruction as string,
                      body: question.slots.body as string,
                      choices: question.slots.choices as string[],
                      answer: question.slots.answer as string,
                      explanation: question.slots.explanation as string,
                      original: question.slots.original as string,
                      translation: question.slots.translation as string,
                    }}
                    layout={{
                      choiceMarker,
                      choiceLayout,
                      questionGroup: template.group,
                    }}
                    showAnswer={includeAnswer}
                    showExplanation={includeExplanation}
                    mode="preview"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* 개별 문제 미리보기 모달 - 공통 컴포넌트 사용 */}
      <QuestionPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        question={selectedQuestion ? {
          instruction: selectedQuestion.slots.instruction as string,
          body: selectedQuestion.slots.body as string,
          choices: selectedQuestion.slots.choices as string[],
          answer: selectedQuestion.slots.answer as string,
          explanation: selectedQuestion.slots.explanation as string,
          original: selectedQuestion.slots.original as string,
          translation: selectedQuestion.slots.translation as string,
        } : null}
        defaultLayout={{
          choiceMarker,
          choiceLayout,
          questionGroup: template.group,
        }}
        questionTypeName={template.name}
        passageName={selectedQuestion?.meta.passageName}
      />
    </Card>
  )
}



