'use client'

/**
 * 출제 2단계 시스템 - 통합 UI (슬롯 기반)
 * 
 * 현재는 원큐 시스템이 우선이므로 스텁 상태로 유지
 * 슬롯 기반 시스템 구현 시 활성화
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Layers, Construction } from 'lucide-react'

interface TwoStepGenerationProps {
  selectedPassageIds: string[]
}

export function TwoStepGeneration({ selectedPassageIds }: TwoStepGenerationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          슬롯 기반 문제 생성
          <Badge variant="secondary">준비 중</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <Construction className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground mb-2">
          슬롯 기반 출제 시스템은 준비 중입니다.
        </p>
        <p className="text-sm text-muted-foreground">
          현재는 <strong>프롬프트 원큐</strong> 방식으로 문제를 생성해주세요.
        </p>
        {selectedPassageIds.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4">
            선택된 지문: {selectedPassageIds.length}개
          </p>
        )}
      </CardContent>
    </Card>
  )
}
