'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  SplitSquareVertical,
  RotateCcw,
  RefreshCw,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSheetImport } from '@/contexts/SheetImportContext'
import { SENTENCE_SPLIT_MODELS, ModelId } from '@/types'

export function SplitDetailPanel() {
  const {
    sheetInfo,
    splitModel,
    setSplitModel,
    splitMode,
    setSplitMode,
    splitResults,
    setSplitResults,
    isSplitting,
    splitProgress,
    showSplitSummary,
    selectedPassageKey,
    setSelectedPassageKey,
    handleSplitSelected,
    handleResplit,
    handleTogglePassage,
    clearPassageResult,
    getSelectedCount,
    getSplitCount,
    getTotalSentences,
    getAverageConfidence,
    getAIErrorCount,
    getAIProcessedCount,
    getKoreanIssueCount,
    getTotalKoreanIssues,
    getPassageByKey,
  } = useSheetImport()

  // 선택된 지문 정보
  const selectedPassageInfo = selectedPassageKey ? getPassageByKey(selectedPassageKey) : null
  const selectedResult = selectedPassageKey ? splitResults[selectedPassageKey] : null

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
      {/* 문장 분리 설정 */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <SplitSquareVertical className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-blue-800">📝 문장 분리 설정</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">AI 모델</label>
            <Select value={splitModel} onValueChange={(v) => setSplitModel(v as ModelId)}>
              <SelectTrigger className="h-9 text-sm bg-white border-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENTENCE_SPLIT_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-blue-700 mb-1">분리 모드</label>
            <Select value={splitMode} onValueChange={(v) => setSplitMode(v as 'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel')}>
              <SelectTrigger className="h-9 text-sm bg-white border-blue-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parallel">
                  <span>🔗 병렬 매칭 (추천)</span>
                </SelectItem>
                <SelectItem value="ai-verify">
                  <span>✅ AI 검증</span>
                </SelectItem>
                <SelectItem value="hybrid">
                  <span>🔄 하이브리드</span>
                </SelectItem>
                <SelectItem value="regex">
                  <span>📝 Regex (무료)</span>
                </SelectItem>
                <SelectItem value="ai">
                  <span>🤖 AI Only</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 문장 분리 실행 버튼 */}
          {getSelectedCount() > 0 && (
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
          )}
        </div>

        {/* 분리 진행 상태 */}
        {isSplitting && splitProgress.total > 0 && (
          <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
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
      </div>

      {/* 분리 완료 요약 */}
      {showSplitSummary && getSplitCount() > 0 && (
        <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">✅ 분리 완료</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded border border-green-200">
              <div className="text-xl font-bold text-green-600">{getSplitCount()}</div>
              <div className="text-xs text-green-700">지문</div>
            </div>
            <div className="bg-white p-2 rounded border border-green-200">
              <div className="text-xl font-bold text-green-600">{getTotalSentences()}</div>
              <div className="text-xs text-green-700">문장</div>
            </div>
            <div className="bg-white p-2 rounded border border-green-200">
              <div className="text-xl font-bold text-green-600">{getAverageConfidence()}%</div>
              <div className="text-xs text-green-700">신뢰도</div>
            </div>
          </div>
          
          {/* AI 처리 실패 */}
          {getAIErrorCount() > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  ❌ {getAIErrorCount()}개 실패
                </span>
              </div>
              <p className="text-xs text-red-700 mt-1">
                좌측에서 실패한 지문을 선택하여 상세 정보를 확인하세요.
              </p>
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
                실패한 지문 재시도 ({getAIErrorCount()}개)
              </Button>
            </div>
          )}
          
          {/* AI 성공 표시 */}
          {getAIProcessedCount() > 0 && getAIErrorCount() === 0 && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">
                  🤖 {getAIProcessedCount()}개 AI 처리 완료
                </span>
              </div>
            </div>
          )}
          
          {/* 한글 품질 문제 */}
          {getKoreanIssueCount() > 0 && (
            <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-800">
                  ⚠️ {getKoreanIssueCount()}개 지문 한글 검토 필요 ({getTotalKoreanIssues()}건)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 선택된 지문 상세 정보 */}
      {selectedPassageInfo && (
        <div className="flex-1 min-h-0 flex flex-col border border-border rounded-lg overflow-hidden">
          {/* 헤더 */}
          <div className={cn(
            "p-3 flex items-center gap-2 flex-shrink-0",
            selectedResult?.error 
              ? "bg-red-50 border-b border-red-200"
              : selectedResult?.splitResult
                ? "bg-green-50 border-b border-green-200"
                : "bg-gray-50 border-b border-gray-200"
          )}>
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold">
              지문 {selectedPassageInfo.passage.number}
            </span>
            <span className="text-xs text-muted-foreground">
              ({selectedPassageInfo.sheetName})
            </span>
            
            {selectedResult?.splitResult && (
              <span className={cn(
                "ml-auto text-xs px-2 py-0.5 rounded-full",
                selectedResult.splitResult.confidence >= 0.9 ? "bg-green-100 text-green-700" :
                selectedResult.splitResult.confidence >= 0.7 ? "bg-yellow-100 text-yellow-700" : 
                "bg-orange-100 text-orange-700"
              )}>
                {selectedResult.splitResult.sentences.length}문장 · 
                {Math.round(selectedResult.splitResult.confidence * 100)}%
              </span>
            )}
            
            {selectedResult?.error && (
              <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                ❌ 실패
              </span>
            )}
          </div>
          
          {/* 내용 */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* 에러 정보 */}
            {selectedResult?.error && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-red-800 text-sm">❌ AI 처리 실패</div>
                    <div className="text-sm text-red-700 mt-1">{selectedResult.error}</div>
                  </div>
                </div>
                
                {/* 에러 원인 분석 */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-3">
                  <div className="text-xs font-medium text-amber-800 mb-1">⚠️ 에러 원인</div>
                  <div className="text-sm text-amber-700">
                    {selectedResult.error.includes('한글') ? (
                      <span>AI가 분리 과정에서 한글 번역을 원본과 다르게 변형했습니다.</span>
                    ) : selectedResult.error.includes('영어') || selectedResult.error.includes('원문') ? (
                      <span>AI가 분리 과정에서 영어 원문을 변형했습니다.</span>
                    ) : (
                      <span>AI 처리 중 예상치 못한 오류가 발생했습니다.</span>
                    )}
                  </div>
                </div>
                
                {/* 해결 방법 */}
                {selectedResult.aiError?.solution && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mb-3">
                    <div className="text-xs font-medium text-blue-800 mb-1">💡 해결 방법</div>
                    <div className="text-sm text-blue-700">{selectedResult.aiError.solution}</div>
                  </div>
                )}
                
                {/* 액션 버튼 */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleResplit(selectedPassageInfo.sheetName, selectedPassageInfo.passage)}
                    disabled={selectedResult.isLoading}
                  >
                    {selectedResult.isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-1" />
                    )}
                    재시도
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-600"
                    onClick={() => {
                      clearPassageResult(selectedPassageKey!)
                      toast.info(`지문 ${selectedPassageInfo.passage.number} 결과 초기화`)
                    }}
                  >
                    건너뛰기
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                    onClick={() => {
                      handleTogglePassage(selectedPassageInfo.sheetName, selectedPassageInfo.passage.number)
                      clearPassageResult(selectedPassageKey!)
                      setSelectedPassageKey(null)
                      toast.info(`지문 ${selectedPassageInfo.passage.number} 선택 해제`)
                    }}
                  >
                    선택 해제
                  </Button>
                </div>
              </div>
            )}
            
            {/* 원본 지문 */}
            <details className="group" open={!!selectedResult?.error}>
              <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                📝 원본 지문
              </summary>
              <div className="mt-3 space-y-3 pl-6">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-medium text-blue-700 mb-2">🇺🇸 영어 원문</div>
                  <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {selectedPassageInfo.passage.englishPassage}
                  </div>
                </div>
                
                {selectedPassageInfo.passage.koreanTranslation && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs font-medium text-green-700 mb-2">🇰🇷 한글 번역</div>
                    <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {selectedPassageInfo.passage.koreanTranslation}
                    </div>
                  </div>
                )}
              </div>
            </details>
            
            {/* 분리 결과 */}
            {selectedResult?.splitResult && (
              <details className="group" open>
                <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                  ✅ 분리 결과 ({selectedResult.splitResult.sentences.length}문장)
                </summary>
                <div className="mt-3 space-y-2 pl-6">
                  {selectedResult.splitResult.sentences.map((sentence, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-3 rounded-lg border",
                        sentence.confidence >= 0.9 ? 'bg-white border-green-200' :
                        sentence.confidence >= 0.7 ? 'bg-yellow-50 border-yellow-200' : 
                        'bg-orange-50 border-orange-200'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          sentence.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                          sentence.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-orange-100 text-orange-700'
                        )}>
                          {sentence.no}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground leading-relaxed">
                            {sentence.content}
                          </div>
                          {sentence.koreanTranslation && (
                            <div className="text-sm text-muted-foreground mt-1 pl-2 border-l-2 border-muted">
                              {sentence.koreanTranslation}
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded flex-shrink-0",
                          sentence.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                          sentence.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-orange-100 text-orange-700'
                        )}>
                          {Math.round(sentence.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
            
            {/* 번역 상태 */}
            {selectedResult?.translationStatus && (
              <div className={cn(
                "p-3 rounded-lg border",
                selectedResult.translationStatus.quality === 'good' ? 'bg-green-50 border-green-200' :
                selectedResult.translationStatus.quality === 'suspicious' ? 'bg-yellow-50 border-yellow-200' : 
                'bg-orange-50 border-orange-200'
              )}>
                <div className="text-xs font-medium mb-1">📝 번역 상태</div>
                <div className="text-xs text-muted-foreground">
                  영어 {selectedResult.translationStatus.sentenceCount.english}문장 / 
                  한글 {selectedResult.translationStatus.sentenceCount.korean}문장
                  {selectedResult.translationStatus.alignment === 'perfect' ? ' ✅ 매칭' : ' ⚠️ 불일치'}
                </div>
              </div>
            )}
            
            {/* 한글 품질 문제 */}
            {selectedResult?.koreanIssues && selectedResult.koreanIssues.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">
                    ⚠️ 한글 번역 검토 필요 ({selectedResult.koreanIssues.length}건)
                  </span>
                </div>
                <div className="space-y-1">
                  {selectedResult.koreanIssues.filter(i => i.needsReview).map((issue, idx) => (
                    <div key={idx} className="text-xs text-amber-700 bg-white p-2 rounded border border-amber-200">
                      • {issue.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 로딩 상태 */}
            {selectedResult?.isLoading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-2 text-muted-foreground">처리 중...</span>
              </div>
            )}
            
            {/* 분리 전 안내 */}
            {!selectedResult && (
              <div className="text-center p-8 text-muted-foreground">
                <SplitSquareVertical className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">아직 분리되지 않은 지문입니다.</p>
                <p className="text-xs mt-1">위의 &quot;문장 분리&quot; 버튼을 클릭하세요.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 지문 미선택 안내 */}
      {!selectedPassageInfo && sheetInfo && (
        <div className="flex-1 flex items-center justify-center text-center p-8">
          <div>
            <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">
              좌측에서 지문을 선택하면<br />
              상세 정보가 표시됩니다
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


