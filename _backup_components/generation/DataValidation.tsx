'use client'

/**
 * 출제 2단계 시스템 - 1단계: 데이터 검증 UI
 * 
 * 지문별 슬롯 데이터가 완비되었는지 검증합니다.
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SlotValidationResult, BatchValidationResult, batchValidateSlotData } from '@/lib/data-validator'
import { CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSlotLabel, type SlotName } from '@/lib/slot-system'

interface DataValidationProps {
  /** 지문별 슬롯 데이터 */
  passageSlotDataList: Array<{
    passageId: string
    passageName: string
    slotData: Record<string, unknown>
  }>
  
  /** 필수 슬롯 목록 */
  requiredSlots: string[]
  
  /** 검증 결과 콜백 */
  onValidationComplete?: (result: BatchValidationResult) => void
  
  /** 지문 상세보기 콜백 */
  onViewPassage?: (passageId: string) => void
}

export function DataValidation({
  passageSlotDataList,
  requiredSlots,
  onValidationComplete,
  onViewPassage,
}: DataValidationProps) {
  // 검증 수행
  const validationResult = React.useMemo(() => {
    const result = batchValidateSlotData(passageSlotDataList, requiredSlots)
    onValidationComplete?.(result)
    return result
  }, [passageSlotDataList, requiredSlots, onValidationComplete])

  if (passageSlotDataList.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          검증할 지문을 선택하세요.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">데이터 검증</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={validationResult.invalid === 0 ? 'default' : 'destructive'}>
              {validationResult.valid}/{validationResult.total} 완료
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          필수 슬롯: {requiredSlots.map(s => getSlotLabel(s as SlotName)).join(', ')}
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {validationResult.results.map((result, index) => (
            <ValidationItem 
              key={result.passageId}
              result={result}
              index={index + 1}
              onView={onViewPassage}
            />
          ))}
        </div>

        {/* 요약 */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              통과: {validationResult.valid}
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="w-4 h-4" />
              실패: {validationResult.invalid}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 개별 검증 결과 아이템
function ValidationItem({ 
  result, 
  index,
  onView,
}: { 
  result: SlotValidationResult
  index: number
  onView?: (passageId: string) => void
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 border rounded',
        result.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      )}
    >
      <div className="flex items-center gap-3">
        {result.isValid ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
        <div>
          <div className="font-medium text-sm">
            {index}. {result.passageName}
          </div>
          {result.errors.length > 0 && (
            <div className="text-xs text-red-600">
              {result.errors[0]}
            </div>
          )}
          {result.warnings.length > 0 && (
            <div className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {result.warnings[0]}
            </div>
          )}
        </div>
      </div>
      
      {onView && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(result.passageId)}
        >
          <Eye className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
