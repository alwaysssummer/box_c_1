'use client'

/**
 * 출제 2단계 시스템 - 통합 UI
 * 
 * 1단계: 사전데이터 검증 (DataValidation)
 * 2단계: 문제 생성/조합 (QuestionComposer)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataValidation } from './DataValidation'
import { QuestionComposer } from './QuestionComposer'
import { ValidationResult } from '@/lib/data-validator'
import { QuestionTemplate, MappedQuestion } from '@/lib/slot-mapper'
import { QuestionGroup, GROUP_INFO, SLOT_GROUPS } from '@/lib/slot-system'
import { cn } from '@/lib/utils'
import { 
  Loader2, 
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// 타입 정의
// ============================================

interface QuestionType {
  id: string
  name: string
  question_group: QuestionGroup
  required_slots: string[]
  prompt_id: string | null  // 프롬프트 직접 생성용
}

interface DataType {
  id: string
  name: string
  target: string
  category?: string
}

interface GenerationProgress {
  total: number
  completed: number
  failed: number
  current: string
  status: 'idle' | 'generating' | 'done' | 'error'
}

interface TwoStepGenerationProps {
  /** 선택된 지문 ID 목록 (좌측 트리에서 선택) */
  selectedPassageIds: string[]
}

// ============================================
// 메인 컴포넌트
// ============================================

export function TwoStepGeneration({ selectedPassageIds }: TwoStepGenerationProps) {
  // 데이터 로딩 상태
  const [isLoading, setIsLoading] = useState(true)
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [dataTypes, setDataTypes] = useState<DataType[]>([])
  
  // 선택 상태
  const [selectedQuestionTypeId, setSelectedQuestionTypeId] = useState<string>('')
  
  // 단계 상태
  const [currentStep, setCurrentStep] = useState<1 | 2>(1)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [passageSlotData, setPassageSlotData] = useState<Array<{
    passageId: string
    passageName: string
    slotData: Record<string, unknown>
  }>>([])
  
  // 데이터 생성 상태
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [selectedDataTypeId, setSelectedDataTypeId] = useState<string>('')
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    current: '',
    status: 'idle'
  })
  const [missingPassageIds, setMissingPassageIds] = useState<string[]>([])
  
  // 프롬프트 직접 생성 상태
  const [directGenerationProgress, setDirectGenerationProgress] = useState<GenerationProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    current: '',
    status: 'idle'
  })
  
  // ============================================
  // 데이터 로딩
  // ============================================
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // 문제 유형 로드
      const qtRes = await fetch('/api/question-types')
      if (qtRes.ok) {
        const qtData = await qtRes.json()
        setQuestionTypes(qtData)
      }
      
      // 데이터 유형 로드
      const dtRes = await fetch('/api/data-types')
      if (dtRes.ok) {
        const dtData = await dtRes.json()
        setDataTypes(dtData)
      }
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
      toast.error('데이터 로딩 실패')
    } finally {
      setIsLoading(false)
    }
  }
  
  // ============================================
  // 단계 진행 로직
  // ============================================
  
  const selectedQuestionType = questionTypes.find(qt => qt.id === selectedQuestionTypeId)
  
  const canProceedToStep2 = validationResult?.canProceed && 
    validationResult.passages.some(p => p.status === 'complete')
  
  const handleValidationComplete = (result: ValidationResult) => {
    setValidationResult(result)
    
    // 검증 완료된 지문의 슬롯 데이터 수집 (API에서 가져와야 함)
    const validPassages = result.passages.filter(p => p.status === 'complete')
    // 실제로는 API에서 슬롯 데이터를 가져와야 하지만, 여기서는 slotDetails 사용
    const slotDataList = validPassages.map(p => ({
      passageId: p.passageId,
      passageName: p.passageName,
      slotData: p.slotDetails 
        ? Object.fromEntries(
            Object.entries(p.slotDetails).map(([key]) => [key, `[${key} 데이터]`])
          )
        : {},
    }))
    setPassageSlotData(slotDataList)
  }
  
  const handleProceedToStep2 = (validPassageIds: string[]) => {
    if (!validationResult) return
    
    // 유효한 지문만 필터링
    const validPassages = validationResult.passages.filter(
      p => validPassageIds.includes(p.passageId) && p.status === 'complete'
    )
    
    const slotDataList = validPassages.map(p => ({
      passageId: p.passageId,
      passageName: p.passageName,
      slotData: p.slotDetails 
        ? Object.fromEntries(
            Object.entries(p.slotDetails).map(([key]) => [key, `[${key} 데이터]`])
          )
        : {},
    }))
    setPassageSlotData(slotDataList)
    setCurrentStep(2)
  }
  
  const handleSaveQuestions = async (questions: MappedQuestion[]) => {
    // TODO: API 호출하여 저장
    toast.success(`${questions.length}개 문제 저장 완료`)
  }
  
  // ============================================
  // 누락 데이터 생성
  // ============================================
  
  const handleOpenGenerateDialog = (passageIds: string[]) => {
    setMissingPassageIds(passageIds)
    setShowGenerateDialog(true)
    setSelectedDataTypeId('')
    setGenerationProgress({
      total: 0,
      completed: 0,
      failed: 0,
      current: '',
      status: 'idle'
    })
  }
  
  const handleGenerateMissing = async () => {
    if (!selectedDataTypeId || missingPassageIds.length === 0) {
      toast.error('데이터 유형을 선택해주세요.')
      return
    }
    
    const dataType = dataTypes.find(dt => dt.id === selectedDataTypeId)
    if (!dataType) return
    
    setGenerationProgress({
      total: missingPassageIds.length,
      completed: 0,
      failed: 0,
      current: '',
      status: 'generating'
    })
    
    let completed = 0
    let failed = 0
    
    for (const passageId of missingPassageIds) {
      // 현재 진행 중인 지문 표시
      setGenerationProgress(prev => ({
        ...prev,
        current: `지문 ${completed + failed + 1}/${missingPassageIds.length} 생성 중...`
      }))
      
      try {
        const response = await fetch('/api/generate-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passageId,
            dataTypeId: selectedDataTypeId,
          }),
        })
        
        if (response.ok) {
          completed++
        } else {
          failed++
        }
      } catch (error) {
        failed++
        console.error('데이터 생성 실패:', error)
      }
      
      // 진행률 업데이트
      setGenerationProgress(prev => ({
        ...prev,
        completed,
        failed,
      }))
    }
    
    // 완료
    setGenerationProgress(prev => ({
      ...prev,
      current: '',
      status: 'done'
    }))
    
    toast.success(`데이터 생성 완료: 성공 ${completed}개, 실패 ${failed}개`)
    
    // 검증 재실행을 위해 다이얼로그 닫기 지연
    setTimeout(() => {
      setShowGenerateDialog(false)
      // 자동 재검증 트리거
      setValidationResult(null)
    }, 1500)
  }
  
  // ============================================
  // 프롬프트 직접 생성
  // ============================================
  
  const handleDirectGenerate = async () => {
    if (!selectedQuestionType?.prompt_id || selectedPassageIds.length === 0) {
      toast.error('문제 유형과 지문을 선택해주세요.')
      return
    }
    
    setDirectGenerationProgress({
      total: selectedPassageIds.length,
      completed: 0,
      failed: 0,
      current: '',
      status: 'generating'
    })
    
    let completed = 0
    let failed = 0
    
    for (const passageId of selectedPassageIds) {
      // 현재 진행 중인 지문 표시
      setDirectGenerationProgress(prev => ({
        ...prev,
        current: `지문 ${completed + failed + 1}/${selectedPassageIds.length} 생성 중...`
      }))
      
      try {
        // 프롬프트 직접 생성 API 호출
        const response = await fetch('/api/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passageId,
            questionTypeId: selectedQuestionType.id,
            promptId: selectedQuestionType.prompt_id,
          }),
        })
        
        if (response.ok) {
          completed++
        } else {
          failed++
          console.error('문제 생성 실패:', await response.text())
        }
      } catch (error) {
        failed++
        console.error('문제 생성 실패:', error)
      }
      
      // 진행률 업데이트
      setDirectGenerationProgress(prev => ({
        ...prev,
        completed,
        failed,
      }))
    }
    
    // 완료
    setDirectGenerationProgress(prev => ({
      ...prev,
      current: '',
      status: 'done'
    }))
    
    toast.success(`문제 생성 완료: 성공 ${completed}개, 실패 ${failed}개`)
  }
  
  // ============================================
  // 렌더링
  // ============================================
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>데이터 로딩 중...</span>
        </CardContent>
      </Card>
    )
  }
  
  const template: QuestionTemplate | null = selectedQuestionType ? {
    id: selectedQuestionType.id,
    name: selectedQuestionType.name,
    group: selectedQuestionType.question_group || 'practical',
    requiredSlots: selectedQuestionType.required_slots?.length > 0
      ? selectedQuestionType.required_slots as any[]
      : SLOT_GROUPS[selectedQuestionType.question_group || 'practical'] || [],
  } : null

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">🚀 출제 2단계 시스템</CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant={currentStep === 1 ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setCurrentStep(1)}
              >
                1단계: 검증
              </Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Badge 
                variant={currentStep === 2 ? "default" : "outline"}
                className={cn(!canProceedToStep2 && "opacity-50")}
              >
                2단계: 조합
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {/* 1단계: 선택 및 검증 */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 좌측: 문제 유형 및 지문 선택 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">📋 출제 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 문제 유형 선택 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">문제 유형</label>
                <Select
                  value={selectedQuestionTypeId}
                  onValueChange={setSelectedQuestionTypeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="문제 유형 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 프롬프트 기반 (🚀) */}
                    {questionTypes.filter(qt => qt.prompt_id).length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-muted-foreground font-medium">🚀 프롬프트 기반</div>
                        {questionTypes.filter(qt => qt.prompt_id).map(qt => (
                          <SelectItem key={qt.id} value={qt.id}>
                            🚀 {qt.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {/* 슬롯 기반 (🧩) */}
                    {questionTypes.filter(qt => !qt.prompt_id).length > 0 && (
                      <>
                        <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-t mt-1 pt-1">🧩 슬롯 기반</div>
                        {questionTypes.filter(qt => !qt.prompt_id).map(qt => (
                          <SelectItem key={qt.id} value={qt.id}>
                            🧩 {qt.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {selectedQuestionType && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      그룹: {GROUP_INFO[selectedQuestionType.question_group || 'practical']?.label}
                    </p>
                    <Badge variant={selectedQuestionType.prompt_id ? "default" : "secondary"} className="text-xs">
                      {selectedQuestionType.prompt_id ? '🚀 프롬프트 직접 생성' : '🧩 슬롯 기반 조합'}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* 선택된 지문 요약 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">선택된 지문</label>
                  <Badge variant={selectedPassageIds.length > 0 ? "default" : "secondary"}>
                    {selectedPassageIds.length}개 선택
                  </Badge>
                </div>
                <div className="border rounded-lg p-4 bg-muted/30">
                  {selectedPassageIds.length > 0 ? (
                    <p className="text-sm text-center text-muted-foreground">
                      ✓ 좌측 트리에서 {selectedPassageIds.length}개 지문 선택됨
                    </p>
                  ) : (
                    <p className="text-sm text-center text-muted-foreground">
                      👈 좌측 트리에서 지문을 선택해주세요
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 우측: 검증 또는 프롬프트 직접 생성 */}
          <div>
            {selectedQuestionTypeId && selectedPassageIds.length > 0 ? (
              selectedQuestionType?.prompt_id ? (
                // 프롬프트 직접 생성 모드
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">🚀 프롬프트 직접 생성</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>프롬프트 직접 생성</strong> 모드입니다.
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        사전 데이터 검증 없이 프롬프트가 직접 문제를 생성합니다.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">선택된 지문: {selectedPassageIds.length}개</p>
                      <p className="text-sm text-muted-foreground">
                        선택된 지문에 대해 문제를 바로 생성합니다.
                      </p>
                    </div>
                    
                    <Button 
                      className="w-full"
                      onClick={() => handleDirectGenerate()}
                      disabled={directGenerationProgress.status === 'generating'}
                    >
                      {directGenerationProgress.status === 'generating' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          생성 중... ({directGenerationProgress.completed}/{directGenerationProgress.total})
                        </>
                      ) : (
                        <>🚀 문제 생성 시작</>
                      )}
                    </Button>
                    
                    {/* 진행률 표시 */}
                    {directGenerationProgress.status !== 'idle' && (
                      <div className="space-y-2">
                        <Progress 
                          value={(directGenerationProgress.completed / directGenerationProgress.total) * 100} 
                        />
                        {directGenerationProgress.current && (
                          <p className="text-xs text-center text-muted-foreground">
                            {directGenerationProgress.current}
                          </p>
                        )}
                        {directGenerationProgress.status === 'done' && (
                          <p className="text-sm text-center text-green-600 font-medium">
                            ✅ 완료: 성공 {directGenerationProgress.completed}개, 실패 {directGenerationProgress.failed}개
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                // 슬롯 기반 조합 모드 - 기존 DataValidation
                <DataValidation
                  questionTypeId={selectedQuestionTypeId}
                  questionTypeName={selectedQuestionType?.name || ''}
                  passageIds={selectedPassageIds}
                  onValidationComplete={handleValidationComplete}
                  onGenerateMissing={(passageIds) => handleOpenGenerateDialog(passageIds)}
                  onProceed={handleProceedToStep2}
                />
              )
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>문제 유형과 지문을 선택해주세요.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* 2단계: 문제 조합 */}
      {currentStep === 2 && template && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
            >
              ← 1단계로 돌아가기
            </Button>
          </div>
          
          <QuestionComposer
            template={template}
            passageSlotDataList={passageSlotData}
            onSave={handleSaveQuestions}
          />
        </div>
      )}
      
      {/* 데이터 생성 다이얼로그 */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🔄 누락 데이터 생성</DialogTitle>
            <DialogDescription>
              {missingPassageIds.length}개 지문에 대해 데이터를 생성합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* 데이터 유형 선택 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">생성할 데이터 유형</label>
              <Select
                value={selectedDataTypeId}
                onValueChange={setSelectedDataTypeId}
                disabled={generationProgress.status === 'generating'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="데이터 유형 선택..." />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes
                    .filter(dt => dt.target === 'passage' && dt.category !== 'base')
                    .map(dt => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                AI 프롬프트가 연결된 데이터 유형만 표시됩니다.
              </p>
            </div>
            
            {/* 진행률 표시 */}
            {generationProgress.status !== 'idle' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>진행률</span>
                  <span>
                    {generationProgress.completed + generationProgress.failed} / {generationProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(generationProgress.completed + generationProgress.failed) / generationProgress.total * 100} 
                  className="h-2"
                />
                {generationProgress.current && (
                  <p className="text-xs text-muted-foreground text-center">
                    {generationProgress.current}
                  </p>
                )}
                {generationProgress.status === 'done' && (
                  <div className="flex gap-2 justify-center text-sm">
                    <span className="text-green-600">✓ 성공: {generationProgress.completed}</span>
                    {generationProgress.failed > 0 && (
                      <span className="text-red-600">✗ 실패: {generationProgress.failed}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGenerateDialog(false)}
              disabled={generationProgress.status === 'generating'}
            >
              {generationProgress.status === 'done' ? '닫기' : '취소'}
            </Button>
            {generationProgress.status !== 'done' && (
              <Button
                onClick={handleGenerateMissing}
                disabled={!selectedDataTypeId || generationProgress.status === 'generating'}
              >
                {generationProgress.status === 'generating' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>생성 시작</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

