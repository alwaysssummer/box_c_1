'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  SplitSquareVertical,
  RefreshCw,
} from 'lucide-react'
import { useSheetImport } from '@/contexts/SheetImportContext'

export function SplitDetailPanel() {
  const {
    sheetInfo,
    splitResults,
    setSplitResults,
    isSplitting,
    splitProgress,
    handleSplitSelected,
    getSelectedCount,
    getSplitCount,
    getTotalSentences,
    getAverageConfidence,
    getAIErrorCount,
    getSelectedSplitCount,
    getSelectedTotalSentences,
    getSelectedAverageConfidence,
    getSelectedErrorCount,
  } = useSheetImport()

  // 시트 정보가 없으면 안내 메시지
  if (!sheetInfo) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div>
          <SplitSquareVertical className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground text-sm">
            구글시트를 조회하면<br />
            문장 분리 설정이 표시됩니다
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4 overflow-auto">
      {/* 문장 분리 실행 */}
      {getSelectedCount() > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 flex-shrink-0">
          <Button
            onClick={handleSplitSelected}
            disabled={isSplitting || getSelectedCount() === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 h-10"
          >
            {isSplitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                문장 분리 중...
              </>
            ) : (
              <>
                <SplitSquareVertical className="w-4 h-4 mr-2" />
                선택된 지문 문장 분리 ({getSelectedCount()}개)
              </>
            )}
          </Button>
        </div>
      )}

      {/* 분리 진행 상태 */}
      {isSplitting && splitProgress.total > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              🚀 병렬 처리 중
            </span>
            <span className="text-sm text-blue-600 font-mono">
              {splitProgress.current} / {splitProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-100 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(splitProgress.current / splitProgress.total) * 100}%` }}
            />
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {splitProgress.currentPassage}
          </div>
        </div>
      )}

      {/* 분리 통계 (항상 표시) */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-800">📊 분리 통계</span>
        </div>
        
        {/* 현재 선택 통계 (항상 표시) */}
        <div className="mb-3">
          <div className="text-xs font-medium text-blue-700 mb-1.5">
            🎯 현재 선택 ({getSelectedCount()}개 지문)
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded border border-blue-200">
              <div className="text-lg font-bold text-blue-600">
                {getSelectedSplitCount()}
              </div>
              <div className="text-xs text-blue-700">완료</div>
            </div>
            <div className="bg-white p-2 rounded border border-blue-200">
              <div className="text-lg font-bold text-blue-600">
                {getSelectedTotalSentences()}
              </div>
              <div className="text-xs text-blue-700">문장</div>
            </div>
            <div className="bg-white p-2 rounded border border-blue-200">
              <div className="text-lg font-bold text-blue-600">
                {getSelectedSplitCount() > 0 ? `${getSelectedAverageConfidence()}%` : '-'}
              </div>
              <div className="text-xs text-blue-700">신뢰도</div>
            </div>
          </div>
          {getSelectedErrorCount() > 0 && (
            <div className="text-xs text-red-600 mt-1">
              ❌ {getSelectedErrorCount()}개 실패
            </div>
          )}
        </div>
        
        {/* 전체 누적 통계 (항상 표시) */}
        <div>
          <div className="text-xs font-medium text-green-700 mb-1.5">📈 전체 누적</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded border border-green-200">
              <div className="text-lg font-bold text-green-600">{getSplitCount()}</div>
              <div className="text-xs text-green-700">완료</div>
            </div>
            <div className="bg-white p-2 rounded border border-green-200">
              <div className="text-lg font-bold text-green-600">{getTotalSentences()}</div>
              <div className="text-xs text-green-700">문장</div>
            </div>
            <div className="bg-white p-2 rounded border border-green-200">
              <div className="text-lg font-bold text-green-600">
                {getSplitCount() > 0 ? `${getAverageConfidence()}%` : '-'}
              </div>
              <div className="text-xs text-green-700">신뢰도</div>
            </div>
          </div>
        </div>
        
        {/* AI 처리 실패 (재시도 버튼 포함) */}
        {getAIErrorCount() > 0 && (
          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                ❌ {getAIErrorCount()}개 실패
              </span>
            </div>
            <Button
              variant="default"
              size="sm"
              className="mt-2 text-xs h-7 bg-red-600 hover:bg-red-700"
              onClick={async () => {
                const failedEntries = Object.entries(splitResults)
                  .filter(([, r]) => r.error)
                
                if (failedEntries.length === 0) return
                
                const clearedResults = { ...splitResults }
                failedEntries.forEach(([key]) => {
                  delete clearedResults[key]
                })
                setSplitResults(clearedResults)
                
                toast.info(`🔄 ${failedEntries.length}개 실패 지문 재시도 시작`)
                setTimeout(() => handleSplitSelected(), 100)
              }}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              재시도
            </Button>
          </div>
        )}
      </div>

    </div>
  )
}


