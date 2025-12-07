'use client'

import { Button } from '@/components/ui/button'
import { Sparkles, Layers, ArrowRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type QuestionTypeMode = 'prompt_based' | 'slot_based'

interface QuestionTypeModeSelectorProps {
  onSelect: (mode: QuestionTypeMode) => void
  onCancel: () => void
}

export function QuestionTypeModeSelector({
  onSelect,
  onCancel,
}: QuestionTypeModeSelectorProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">문제 유형 추가</h2>
          <p className="text-sm text-muted-foreground">
            출제 방식을 선택하세요. 대부분의 문제는 프롬프트 원큐로 간편하게 생성할 수 있습니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 선택 영역 */}
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-6 max-w-3xl">
          {/* 프롬프트 원큐 */}
          <button
            onClick={() => onSelect('prompt_based')}
            className={cn(
              'group relative flex flex-col p-6 rounded-xl border-2 transition-all text-left',
              'hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100',
              'bg-gradient-to-br from-blue-50 to-white'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold">프롬프트 원큐</span>
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                추천
              </span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              프롬프트가 완성된 문제를 직접 생성합니다.
              빠르고 간단한 설정으로 바로 사용 가능!
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                설정 항목: 3개 (유형명, 프롬프트, 지시문)
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                제목/주제/요지/빈칸/순서/삽입 등
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                실전형 문제에 최적화
              </div>
            </div>

            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-5 h-5 text-blue-500" />
            </div>
          </button>

          {/* 슬롯 기반 */}
          <button
            onClick={() => onSelect('slot_based')}
            className={cn(
              'group relative flex flex-col p-6 rounded-xl border-2 transition-all text-left',
              'hover:border-slate-400 hover:shadow-lg hover:shadow-slate-100',
              'bg-gradient-to-br from-slate-50 to-white'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-slate-500 rounded-lg">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold">슬롯 기반 조합</span>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              데이터 유형을 조합해서 문제를 구성합니다.
              세밀한 커스터마이징이 가능합니다.
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                설정 항목: 10개+ (그룹, 템플릿, 슬롯 매핑)
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                사전 데이터 생성 후 조합
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                복잡한 문제 유형에 적합
              </div>
            </div>

            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-5 h-5 text-slate-500" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
