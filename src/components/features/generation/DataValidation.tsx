'use client'

/**
 * 출제 2단계 시스템 - 1단계: 사전데이터 검증 UI
 */

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  ValidationResult,
  PassageValidationResult,
  formatValidationForUI,
  getPassageStatusIcon,
  getPassageStatusColor,
} from '@/lib/data-validator'
import { getSlotLabel, SlotName } from '@/lib/slot-system'
import { ChevronDown, ChevronRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react'

interface DataValidationProps {
  questionTypeId: string
  questionTypeName: string
  passageIds: string[]
  onValidationComplete?: (result: ValidationResult) => void
  onGenerateMissing?: (passageIds: string[], missingSlots: SlotName[]) => void
  onProceed?: (validPassageIds: string[]) => void
}

export function DataValidation({
  questionTypeId,
  questionTypeName,
  passageIds,
  onValidationComplete,
  onGenerateMissing,
  onProceed,
}: DataValidationProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set())

  // 검증 실행
  const runValidation = useCallback(async () => {
    if (!questionTypeId || passageIds.length === 0) return

    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch('/api/generation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionTypeId, passageIds }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '검증 실패')
      }

      const result: ValidationResult = await response.json()
      setValidationResult(result)
      onValidationComplete?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검증 중 오류 발생')
    } finally {
      setIsValidating(false)
    }
  }, [questionTypeId, passageIds, onValidationComplete])

  // 지문 펼치기/접기
  const togglePassage = (passageId: string) => {
    setExpandedPassages(prev => {
      const next = new Set(prev)
      if (next.has(passageId)) {
        next.delete(passageId)
      } else {
        next.add(passageId)
      }
      return next
    })
  }

  // 출제 가능한 지문만 필터링
  const getValidPassageIds = (): string[] => {
    if (!validationResult) return []
    return validationResult.passages
      .filter(p => p.status === 'complete')
      .map(p => p.passageId)
  }

  // 누락 데이터가 있는 지문
  const getMissingDataPassages = (): PassageValidationResult[] => {
    if (!validationResult) return []
    return validationResult.passages.filter(p => p.status !== 'complete')
  }

  // UI 포맷 데이터
  const uiFormat = validationResult ? formatValidationForUI(validationResult) : null

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">📋 사전데이터 검증</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runValidation}
            disabled={isValidating || passageIds.length === 0}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
            {isValidating ? '검증 중...' : '검증 실행'}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          문제 유형: <span className="font-medium">{questionTypeName}</span> | 
          대상 지문: <span className="font-medium">{passageIds.length}개</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 에러 표시 */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* 검증 전 안내 */}
        {!validationResult && !isValidating && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <p>검증 실행 버튼을 클릭하여</p>
            <p>사전데이터 준비 상태를 확인하세요.</p>
          </div>
        )}

        {/* 검증 결과 요약 */}
        {validationResult && uiFormat && (
          <>
            {/* 진행률 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>준비 완료율</span>
                <span className="font-medium">{uiFormat.progressPercent}%</span>
              </div>
              <Progress value={uiFormat.progressPercent} className="h-2" />
            </div>

            {/* 상태 요약 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResult.summary.complete}
                </div>
                <div className="text-xs text-green-700">완료</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResult.summary.partial}
                </div>
                <div className="text-xs text-yellow-700">일부 누락</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {validationResult.summary.missing}
                </div>
                <div className="text-xs text-red-700">미생성</div>
              </div>
            </div>

            {/* 메시지 */}
            <div className={`p-3 rounded-lg ${
              validationResult.canProceed 
                ? 'bg-green-50 text-green-700' 
                : 'bg-yellow-50 text-yellow-700'
            }`}>
              {validationResult.message}
            </div>

            {/* 필요 슬롯 목록 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">필요 슬롯:</div>
              <div className="flex flex-wrap gap-1">
                {validationResult.requiredSlots.map(slot => (
                  <Badge key={slot} variant="outline" className="text-xs">
                    {getSlotLabel(slot)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 지문별 상세 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">지문별 상태:</div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {validationResult.passages.map(passage => (
                  <Collapsible
                    key={passage.passageId}
                    open={expandedPassages.has(passage.passageId)}
                    onOpenChange={() => togglePassage(passage.passageId)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 p-2 hover:bg-muted rounded text-left">
                        {expandedPassages.has(passage.passageId) 
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                        <span>{getPassageStatusIcon(passage.status)}</span>
                        <span className={`flex-1 text-sm ${getPassageStatusColor(passage.status)}`}>
                          {passage.passageName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {passage.existingSlots.length}/{validationResult.requiredSlots.length}
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-8 p-2 space-y-2 text-sm bg-muted/50 rounded">
                        {passage.textbookName && (
                          <div className="text-xs text-muted-foreground">
                            {passage.textbookName} &gt; {passage.unitName}
                          </div>
                        )}
                        
                        {passage.existingSlots.length > 0 && (
                          <div>
                            <span className="text-green-600">✓ 있음: </span>
                            {passage.existingSlots.map(s => getSlotLabel(s)).join(', ')}
                          </div>
                        )}
                        
                        {passage.missingRequiredSlots.length > 0 && (
                          <div>
                            <span className="text-red-600">✗ 필수 누락: </span>
                            {passage.missingRequiredSlots.map(s => getSlotLabel(s)).join(', ')}
                          </div>
                        )}
                        
                        {passage.missingOptionalSlots.length > 0 && (
                          <div>
                            <span className="text-yellow-600">○ 선택 누락: </span>
                            {passage.missingOptionalSlots.map(s => getSlotLabel(s)).join(', ')}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2">
              {getMissingDataPassages().length > 0 && onGenerateMissing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const missing = getMissingDataPassages()
                    const allMissingSlots = [...new Set(
                      missing.flatMap(p => p.missingSlots)
                    )] as SlotName[]
                    onGenerateMissing(
                      missing.map(p => p.passageId),
                      allMissingSlots
                    )
                  }}
                >
                  누락 데이터 생성 ({getMissingDataPassages().length}개)
                </Button>
              )}
              
              {validationResult.canProceed && onProceed && (
                <Button
                  size="sm"
                  onClick={() => onProceed(getValidPassageIds())}
                  className="ml-auto"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  출제 진행 ({getValidPassageIds().length}개)
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}



