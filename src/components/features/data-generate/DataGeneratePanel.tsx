// @ts-nocheck
'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, RefreshCw, CheckCircle, XCircle, Clock, Coins, Database } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDataGenerate } from '@/contexts/DataGenerateContext'
import { AI_MODELS, ModelId } from '@/types'

export function DataGeneratePanel() {
  const {
    model,
    setModel,
    dataTypes,
    selectedDataTypeId,
    generationResults,
    isGenerating,
    clearResults,
    getCompletedCount,
    getFailedCount,
    getAverageConfidence,
    getTotalTokens,
    selectedResultKey,
    setSelectedResultKey,
    getResultByKey,
    handleRegenerateOne,
    passages,
  } = useDataGenerate()

  const completedCount = getCompletedCount()
  const failedCount = getFailedCount()
  const avgConfidence = getAverageConfidence()
  const totalTokens = getTotalTokens()
  
  const selectedResult = selectedResultKey ? getResultByKey(selectedResultKey) : null
  const selectedDataType = dataTypes.find(dt => dt.id === selectedDataTypeId)
  const selectedPassage = selectedResult 
    ? passages.find(p => p.id === selectedResult.passageId) 
    : null

  return (
    <div className="space-y-4">
      {/* AI 모델 설정 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          🤖 AI 모델 설정
        </h4>
        <Select
          value={model}
          onValueChange={(v) => setModel(v as ModelId)}
          disabled={isGenerating}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AI_MODELS).map(([id, info]) => {
              const modelInfo = info as { name: string; description: string }
              return (
                <SelectItem key={id} value={id}>
                  <div className="flex items-center gap-2">
                    <span>{modelInfo.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({modelInfo.description})
                    </span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">
          💡 데이터 유형의 추천 모델이 자동 선택되며, 여기서 변경 가능합니다.
        </p>
      </div>

      {/* 전체 통계 */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground">
            📊 생성 통계
          </h4>
          {(completedCount > 0 || failedCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearResults}
              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={isGenerating}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              초기화
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xl font-bold">{completedCount}</span>
            </div>
            <p className="text-xs text-green-600">성공</p>
          </div>
          
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-red-700">
              <XCircle className="w-4 h-4" />
              <span className="text-xl font-bold">{failedCount}</span>
            </div>
            <p className="text-xs text-red-600">실패</p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-blue-700">
              <Database className="w-4 h-4" />
              <span className="text-xl font-bold">{avgConfidence}%</span>
            </div>
            <p className="text-xs text-blue-600">평균 신뢰도</p>
          </div>
          
          <div className="bg-violet-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-violet-700">
              <Coins className="w-4 h-4" />
              <span className="text-xl font-bold">
                {((totalTokens.input + totalTokens.output) / 1000).toFixed(1)}k
              </span>
            </div>
            <p className="text-xs text-violet-600">총 토큰</p>
          </div>
        </div>
      </div>

      {/* 선택된 결과 상세 */}
      {selectedResult && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className={cn(
            'p-3 flex items-center justify-between',
            selectedResult.status === 'completed' && 'bg-green-50',
            selectedResult.status === 'failed' && 'bg-red-50',
          )}>
            <div className="flex items-center gap-2">
              {selectedResult.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium text-sm">
                {selectedPassage?.name || '지문'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedResult.status === 'failed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerateOne(selectedResult.passageId)}
                  disabled={isGenerating}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  재생성
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedResultKey(null)}
                className="h-7 text-xs"
              >
                닫기
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {/* 메타 정보 */}
            <div className="flex flex-wrap gap-2 text-xs">
              {selectedDataType && (
                <Badge variant="outline">
                  📊 {selectedDataType.name}
                </Badge>
              )}
              {selectedResult.modelUsed && (
                <Badge variant="outline">
                  🤖 {selectedResult.modelUsed}
                </Badge>
              )}
              {selectedResult.responseTime && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {(selectedResult.responseTime / 1000).toFixed(2)}초
                </Badge>
              )}
              {(selectedResult.inputTokens || selectedResult.outputTokens) && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {selectedResult.inputTokens}/{selectedResult.outputTokens} 토큰
                </Badge>
              )}
            </div>

            {/* 결과 또는 에러 */}
            {selectedResult.status === 'completed' && selectedResult.result && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">생성 결과:</label>
                <pre className="mt-1 p-3 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap">
                  {JSON.stringify(selectedResult.result, null, 2)}
                </pre>
              </div>
            )}

            {selectedResult.status === 'failed' && selectedResult.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">❌ 오류 발생</p>
                <p className="text-xs text-red-600 mt-1">{selectedResult.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!selectedResult && completedCount === 0 && failedCount === 0 && (
        <div className="border border-dashed border-border rounded-lg p-6 text-center">
          <Database className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            아직 생성된 데이터가 없습니다
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            왼쪽에서 데이터 유형과 지문을 선택하고<br />
            &quot;데이터 생성&quot; 버튼을 클릭하세요
          </p>
        </div>
      )}
    </div>
  )
}



