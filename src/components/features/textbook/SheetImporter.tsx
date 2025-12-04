'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ChevronRight, 
  ChevronDown, 
  Loader2, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  SplitSquareVertical,
  Eye,
  EyeOff,
  RotateCcw,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SENTENCE_SPLIT_MODELS, ModelId, ParsedSentence, SentenceSplitResult, TranslationStatus, KoreanIssue, AIErrorResponse } from '@/types'

interface SheetPassage {
  number: string
  englishPassage: string
  koreanTranslation: string
}

interface ParsedSheet {
  sheetName: string
  gid: string
  passages: SheetPassage[]
}

interface SheetInfo {
  fileName: string
  sheetId: string
  sheets: ParsedSheet[]
}

// 문장 분리 결과 인터페이스
interface PassageSplitResult {
  passageNumber: string
  sheetName: string
  splitResult?: SentenceSplitResult
  translationStatus?: TranslationStatus
  koreanIssues?: KoreanIssue[]  // 한글 품질 문제 (관리자 알림용)
  aiError?: AIErrorResponse     // AI 에러 상세 정보
  isLoading: boolean
  error?: string
}

interface SheetImporterProps {
  groupName: string
  onRegister: (data: {
    name: string
    units: { 
      name: string
      passages: { 
        name: string
        content?: string
        koreanTranslation?: string
        sentences?: ParsedSentence[]
        splitModel?: string
        splitConfidence?: number
      }[] 
    }[]
  }) => Promise<void>
}

export function SheetImporter({ groupName, onRegister }: SheetImporterProps) {
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null)
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({})
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})
  const [isFetching, setIsFetching] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 문장 분리 관련 상태
  const [splitModel, setSplitModel] = useState<ModelId>('gemini-2.0-flash')
  const [splitMode, setSplitMode] = useState<'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel'>('parallel')
  const [splitResults, setSplitResults] = useState<Record<string, PassageSplitResult>>({})
  const [isSplitting, setIsSplitting] = useState(false)
  const [showSplitPreview, setShowSplitPreview] = useState<Record<string, boolean>>({})
  
  // 분리 진행 상태
  const [splitProgress, setSplitProgress] = useState({ current: 0, total: 0, currentPassage: '' })
  const [showSplitSummary, setShowSplitSummary] = useState(false)

  // 실제 구글 시트 데이터 조회
  const handleFetchSheet = async () => {
    if (!googleSheetUrl.trim() || isFetching) return

    setIsFetching(true)
    setError(null)
    setSheetInfo(null)
    setSplitResults({})
    setShowSplitSummary(false)
    
    try {
      const response = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl.trim() })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch sheet')
      }
      
      const data: SheetInfo = await response.json()
      setSheetInfo(data)
      setSelectedItems({})
      setExpandedUnits({})
    } catch (err) {
      setError(err instanceof Error ? err.message : '시트를 불러오는데 실패했습니다')
    } finally {
      setIsFetching(false)
    }
  }

  // 문장 분리 실행
  const splitPassage = useCallback(async (
    sheetName: string,
    passage: SheetPassage
  ): Promise<PassageSplitResult> => {
    try {
      const response = await fetch('/api/sentence-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: passage.englishPassage,
          koreanText: passage.koreanTranslation || null,
          model: splitModel,
          mode: splitMode,
          includeTranslationAnalysis: true,
        })
      })

      const result = await response.json()

      // API 에러 응답 처리
      if (!response.ok || !result.success) {
        const errorMessage = result.error || '문장 분리 실패'
        const aiError = result.aiError
        
        toast.error(`❌ AI 처리 실패 - 지문 ${passage.number}`, {
          description: aiError?.solution 
            ? `${errorMessage}\n💡 ${aiError.solution}`
            : errorMessage,
          duration: 10000,
        })
        
        return {
          passageNumber: passage.number,
          sheetName,
          isLoading: false,
          error: errorMessage,
          aiError: aiError,
        }
      }

      // 성공
      return {
        passageNumber: passage.number,
        sheetName,
        splitResult: {
          sentences: result.sentences,
          confidence: result.confidence,
          method: result.method,
          model: result.model,
          warnings: result.warnings,
          koreanIssues: result.koreanIssues,
        },
        translationStatus: result.translationStatus,
        koreanIssues: result.koreanIssues,
        isLoading: false,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      
      toast.error(`문장 분리 실패 - 지문 ${passage.number}`, {
        description: `${errorMessage}\n🔄 재시도 버튼을 클릭하세요.`,
      })
      
      return {
        passageNumber: passage.number,
        sheetName,
        isLoading: false,
        error: errorMessage,
      }
    }
  }, [splitModel, splitMode])

  // 선택된 지문들 문장 분리
  const handleSplitSelected = async () => {
    if (!sheetInfo || isSplitting) return

    // 분리할 지문 목록 생성
    const passagesToSplit: { sheetName: string; passage: SheetPassage; key: string }[] = []
    
    for (const [sheetName, passageNumbers] of Object.entries(selectedItems)) {
      const sheet = sheetInfo.sheets.find(s => s.sheetName === sheetName)
      if (!sheet) continue

      for (const passageNumber of passageNumbers) {
        const passage = sheet.passages.find(p => p.number === passageNumber)
        if (!passage) continue
        
        const key = `${sheetName}-${passageNumber}`
        // 이미 분리된 경우 스킵
        if (splitResults[key]?.splitResult && !splitResults[key].error) continue
        
        passagesToSplit.push({ sheetName, passage, key })
      }
    }

    if (passagesToSplit.length === 0) {
      setShowSplitSummary(true)
      return
    }

    setIsSplitting(true)
    setSplitProgress({ current: 0, total: passagesToSplit.length, currentPassage: '' })
    setShowSplitSummary(false)
    
    const newResults: Record<string, PassageSplitResult> = { ...splitResults }
    
    // 🚀 병렬 처리: 동시 10개씩 처리 (유료 티어)
    const BATCH_SIZE = 10
    let completedCount = 0

    for (let batchStart = 0; batchStart < passagesToSplit.length; batchStart += BATCH_SIZE) {
      const batch = passagesToSplit.slice(batchStart, batchStart + BATCH_SIZE)
      
      // 배치 내 모든 지문 로딩 상태로 표시
      batch.forEach(({ sheetName, passage, key }) => {
        newResults[key] = { 
          passageNumber: passage.number, 
          sheetName, 
          isLoading: true 
        }
      })
      setSplitResults({ ...newResults })
      
      // 진행 상태 업데이트
      const currentBatch = Math.min(batchStart + BATCH_SIZE, passagesToSplit.length)
      setSplitProgress({ 
        current: completedCount, 
        total: passagesToSplit.length, 
        currentPassage: `배치 처리 중 (${batch.length}개 동시)` 
      })

      // 🔥 병렬 실행: 배치 내 모든 지문 동시 처리
      const batchResults = await Promise.allSettled(
        batch.map(({ sheetName, passage }) => splitPassage(sheetName, passage))
      )

      // 결과 저장
      batch.forEach(({ sheetName, passage, key }, index) => {
        const result = batchResults[index]
        if (result.status === 'fulfilled') {
          newResults[key] = result.value
        } else {
          newResults[key] = {
            passageNumber: passage.number,
            sheetName,
            error: result.reason?.message || '처리 실패',
          }
        }
        completedCount++
      })
      
      setSplitResults({ ...newResults })
      setSplitProgress({ 
        current: completedCount, 
        total: passagesToSplit.length, 
        currentPassage: `완료: ${completedCount}/${passagesToSplit.length}` 
      })

      // 해당 단원 펼치기 + 미리보기 자동 열기
      batch.forEach(({ sheetName, key }) => {
        setExpandedUnits(prev => ({ ...prev, [sheetName]: true }))
        setShowSplitPreview(prev => ({ ...prev, [key]: true }))
      })
    }

    setIsSplitting(false)
    setSplitProgress({ current: 0, total: 0, currentPassage: '' })
    setShowSplitSummary(true)
  }

  // 단일 지문 문장 분리 재시도
  const handleResplit = async (sheetName: string, passage: SheetPassage) => {
    const key = `${sheetName}-${passage.number}`
    
    setSplitResults(prev => ({
      ...prev,
      [key]: { passageNumber: passage.number, sheetName, isLoading: true }
    }))

    const result = await splitPassage(sheetName, passage)
    
    setSplitResults(prev => ({
      ...prev,
      [key]: result
    }))
    
    // 미리보기 자동 열기
    setShowSplitPreview(prev => ({ ...prev, [key]: true }))
  }

  const toggleUnitExpand = (sheetName: string) => {
    setExpandedUnits((prev) => ({ ...prev, [sheetName]: !prev[sheetName] }))
  }

  const handleToggleUnit = (sheet: ParsedSheet) => {
    const allPassages = sheet.passages.map(p => p.number)
    const currentSelected = selectedItems[sheet.sheetName] || []

    if (currentSelected.length === allPassages.length) {
      setSelectedItems((prev) => {
        const newItems = { ...prev }
        delete newItems[sheet.sheetName]
        return newItems
      })
    } else {
      setSelectedItems((prev) => ({
        ...prev,
        [sheet.sheetName]: [...allPassages],
      }))
    }
  }

  const handleTogglePassage = (sheetName: string, passageNumber: string) => {
    setSelectedItems((prev) => {
      const currentSelected = prev[sheetName] || []
      const newSelected = currentSelected.includes(passageNumber)
        ? currentSelected.filter((p) => p !== passageNumber)
        : [...currentSelected, passageNumber]

      if (newSelected.length === 0) {
        const newItems = { ...prev }
        delete newItems[sheetName]
        return newItems
      }

      return { ...prev, [sheetName]: newSelected }
    })
  }

  const handleToggleAllPassages = () => {
    if (!sheetInfo) return

    const totalPassages = sheetInfo.sheets.reduce((sum, s) => sum + s.passages.length, 0)
    const selectedPassages = Object.values(selectedItems).reduce(
      (sum, arr) => sum + arr.length,
      0
    )

    if (selectedPassages === totalPassages) {
      setSelectedItems({})
    } else {
      const allSelected: Record<string, string[]> = {}
      sheetInfo.sheets.forEach((sheet) => {
        allSelected[sheet.sheetName] = sheet.passages.map(p => p.number)
      })
      setSelectedItems(allSelected)
    }
  }

  const toggleSplitPreview = (key: string) => {
    setShowSplitPreview(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const getSelectedCount = () =>
    Object.values(selectedItems).reduce((sum, arr) => sum + arr.length, 0)

  const getSplitCount = () => 
    Object.values(splitResults).filter(r => r.splitResult && !r.error).length

  const getTotalSentences = () =>
    Object.values(splitResults).reduce(
      (sum, r) => sum + (r.splitResult?.sentences.length || 0), 
      0
    )
  
  const getAverageConfidence = () => {
    const results = Object.values(splitResults).filter(r => r.splitResult)
    if (results.length === 0) return 0
    const sum = results.reduce((s, r) => s + (r.splitResult?.confidence || 0), 0)
    return Math.round((sum / results.length) * 100)
  }

  // 한글 품질 문제가 있는 지문 개수
  const getKoreanIssueCount = () => 
    Object.values(splitResults).filter(r => r.koreanIssues && r.koreanIssues.length > 0).length

  // 총 한글 문제 개수
  const getTotalKoreanIssues = () =>
    Object.values(splitResults).reduce(
      (sum, r) => sum + (r.koreanIssues?.length || 0),
      0
    )

  // 처리 실패한 지문 개수
  const getAIErrorCount = () =>
    Object.values(splitResults).filter(r => r.error).length

  // AI로 처리된 지문 개수 (parallel 또는 ai-verify 모드)
  const getAIProcessedCount = () =>
    Object.values(splitResults).filter(r => 
      r.splitResult?.method === 'parallel' || 
      r.splitResult?.method === 'ai-verify' ||
      r.splitResult?.method === 'ai'
    ).length

  // 교재 등록
  const handleRegister = async () => {
    if (!sheetInfo || getSelectedCount() === 0 || isRegistering) return

    setIsRegistering(true)
    try {
      // 선택된 항목을 단원/지문 구조로 변환
      const units = Object.entries(selectedItems).map(([sheetName, passageNumbers]) => {
        const sheet = sheetInfo.sheets.find(s => s.sheetName === sheetName)
        const passages = passageNumbers.map((num) => {
          const passage = sheet?.passages.find(p => p.number === num)
          const key = `${sheetName}-${num}`
          const splitResult = splitResults[key]

          return {
            name: `지문 ${num}`,
            content: passage?.englishPassage || '',
            koreanTranslation: passage?.koreanTranslation || '',
            sentences: splitResult?.splitResult?.sentences,
            splitModel: splitResult?.splitResult?.model,
            splitConfidence: splitResult?.splitResult?.confidence,
          }
        })
        return {
          name: sheetName,
          passages,
        }
      })

      await onRegister({
        name: sheetInfo.fileName,
        units,
      })

      // 초기화
      setGoogleSheetUrl('')
      setSheetInfo(null)
      setSelectedItems({})
      setExpandedUnits({})
      setSplitResults({})
      setShowSplitSummary(false)
    } finally {
      setIsRegistering(false)
    }
  }

  const totalPassages = sheetInfo?.sheets.reduce((sum, s) => sum + s.passages.length, 0) || 0

  // 분리 결과 상태 아이콘
  const getSplitStatusIcon = (key: string) => {
    const result = splitResults[key]
    if (!result) return null
    if (result.isLoading) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    if (result.error) return <AlertCircle className="w-4 h-4 text-destructive" />
    if (result.splitResult) {
      const conf = result.splitResult.confidence
      if (conf >= 0.9) return <CheckCircle2 className="w-4 h-4 text-green-500" />
      if (conf >= 0.7) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      return <AlertCircle className="w-4 h-4 text-orange-500" />
    }
    return null
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">
        📁 {groupName} - 교재 등록
      </h3>

      {/* 구글시트 URL 입력 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          구글시트 URL
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1"
            disabled={isFetching}
          />
          <Button
            onClick={handleFetchSheet}
            disabled={!googleSheetUrl.trim() || isFetching}
            className="bg-green-600 hover:bg-green-700"
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              '조회'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          * 시트가 &quot;링크가 있는 모든 사용자&quot;로 공유되어 있어야 합니다
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 시트 정보 */}
      {sheetInfo && (
        <div className="border border-border rounded-lg p-4 space-y-4">
          {/* 교재명 */}
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <span className="text-sm text-muted-foreground">교재명:</span>
            <span className="font-semibold text-primary">{sheetInfo.fileName}</span>
            <span className="text-xs text-muted-foreground">
              ({sheetInfo.sheets.length}개 시트, {totalPassages}개 지문)
            </span>
          </div>

          {/* 문장 분리 설정 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <SplitSquareVertical className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-800">📝 문장 분리 설정</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
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

            {/* 분리 진행 상태 - 병렬 처리 */}
            {isSplitting && splitProgress.total > 0 && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">
                    🚀 병렬 처리 중 (10개씩)
                  </span>
                  <span className="text-sm text-blue-600 font-mono">
                    {splitProgress.current} / {splitProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3 mb-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(splitProgress.current / splitProgress.total) * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-600">
                    🔄 {splitProgress.currentPassage}
                  </span>
                  <span className="text-blue-500">
                    예상 시간: ~{Math.ceil((splitProgress.total - splitProgress.current) / 10 * 2)}초
                  </span>
                </div>
              </div>
            )}

            {/* 분리 완료 요약 */}
            {showSplitSummary && getSplitCount() > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">✅ 문장 분리 완료!</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white p-2 rounded border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{getSplitCount()}</div>
                    <div className="text-xs text-green-700">분리된 지문</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{getTotalSentences()}</div>
                    <div className="text-xs text-green-700">총 문장 수</div>
                  </div>
                  <div className="bg-white p-2 rounded border border-green-200">
                    <div className="text-2xl font-bold text-green-600">{getAverageConfidence()}%</div>
                    <div className="text-xs text-green-700">평균 신뢰도</div>
                  </div>
                </div>
                
                {/* AI 처리 실패 */}
                {getAIErrorCount() > 0 && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        ❌ {getAIErrorCount()}개 지문 AI 처리 실패 - 재시도 필요
                      </span>
                    </div>
                    <p className="text-xs text-red-700 mt-1">
                      AI 처리에 실패한 지문이 있습니다. 재시도하거나 다른 AI 모델을 선택해주세요.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs h-8 bg-red-600 hover:bg-red-700"
                        onClick={async () => {
                          // 실패한 지문들 재시도
                          const failedEntries = Object.entries(splitResults)
                            .filter(([, r]) => r.error)
                          
                          if (failedEntries.length === 0) return
                          
                          // 실패한 지문 결과 초기화 (재시도할 수 있도록)
                          const clearedResults = { ...splitResults }
                          failedEntries.forEach(([key]) => {
                            delete clearedResults[key]
                          })
                          setSplitResults(clearedResults)
                          
                          toast.info(`🔄 ${failedEntries.length}개 실패 지문 재시도 시작`)
                          
                          // 재시도 실행 (handleSplitSelected가 진행 상황 표시)
                          setTimeout(() => handleSplitSelected(), 100)
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        실패한 지문 재시도 ({getAIErrorCount()}개)
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* AI 성공 표시 */}
                {getAIProcessedCount() > 0 && getAIErrorCount() === 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        🤖 {getAIProcessedCount()}개 지문 AI로 정상 처리됨
                      </span>
                    </div>
                  </div>
                )}
                
                {/* 한글 품질 문제 경고 */}
                {getKoreanIssueCount() > 0 && (
                  <div className="mt-3 p-3 bg-amber-100 rounded-lg border border-amber-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">
                        ⚠️ {getKoreanIssueCount()}개 지문에서 한글 번역 문제가 발견되었습니다 (총 {getTotalKoreanIssues()}건)
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1">
                      아래에서 각 지문의 상세 내용을 확인해주세요. 영어 원문과 한글 해석은 수정되지 않았습니다.
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-green-700 mt-3 text-center">
                  아래에서 각 지문의 분리 결과를 확인하고, &quot;교재 등록&quot; 버튼을 클릭하세요.
                </p>
              </div>
            )}
          </div>

          {/* 단원/지문 선택 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                📚 시트/지문 선택
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleAllPassages}
                className="text-primary hover:text-primary"
              >
                {getSelectedCount() === totalPassages ? '전체 해제' : '전체 선택'}
              </Button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-auto border border-border rounded-lg p-2 bg-muted/30">
              {sheetInfo.sheets.map((sheet) => {
                const sheetSelected = selectedItems[sheet.sheetName] || []
                const isAllSelected = sheetSelected.length === sheet.passages.length
                const isPartialSelected =
                  sheetSelected.length > 0 && sheetSelected.length < sheet.passages.length
                const isExpanded = expandedUnits[sheet.sheetName]
                
                // 해당 시트의 분리 완료 지문 수
                const splitCountInSheet = sheet.passages.filter(p => {
                  const key = `${sheet.sheetName}-${p.number}`
                  return splitResults[key]?.splitResult && !splitResults[key]?.error
                }).length

                return (
                  <div
                    key={sheet.sheetName}
                    className="bg-white rounded-lg border border-border overflow-hidden"
                  >
                    <div className="flex items-center gap-2 p-3 hover:bg-muted/50">
                      <button
                        onClick={() => toggleUnitExpand(sheet.sheetName)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isPartialSelected
                          }
                        }}
                        onCheckedChange={() => handleToggleUnit(sheet)}
                      />

                      <span
                        className="font-medium cursor-pointer flex-1"
                        onClick={() => toggleUnitExpand(sheet.sheetName)}
                      >
                        {sheet.sheetName}
                      </span>

                      <div className="flex items-center gap-2">
                        {splitCountInSheet > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {splitCountInSheet}개 분리됨
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {sheetSelected.length}/{sheet.passages.length}
                        </span>
                      </div>
                    </div>

                    {/* 지문 목록 */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 p-2 space-y-2">
                        {sheet.passages.map((passage) => {
                          const key = `${sheet.sheetName}-${passage.number}`
                          const splitResult = splitResults[key]
                          const isPreviewOpen = showSplitPreview[key]
                          const hasSplitResult = splitResult?.splitResult && !splitResult?.error

                          return (
                            <div 
                              key={passage.number}
                              className={cn(
                                "bg-white rounded-lg border overflow-hidden transition-all",
                                hasSplitResult ? "border-green-300" : "border-border"
                              )}
                            >
                              {/* 지문 헤더 */}
                              <div className="flex items-start gap-3 p-3">
                                <Checkbox
                                  checked={sheetSelected.includes(passage.number)}
                                  onCheckedChange={() =>
                                    handleTogglePassage(sheet.sheetName, passage.number)
                                  }
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground">
                                      지문 {passage.number}
                                    </span>
                                    {getSplitStatusIcon(key)}
                                    {splitResult?.splitResult && (
                                      <span className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        splitResult.splitResult.confidence >= 0.9 ? "bg-green-100 text-green-700" :
                                        splitResult.splitResult.confidence >= 0.7 ? "bg-yellow-100 text-yellow-700" : 
                                        "bg-orange-100 text-orange-700"
                                      )}>
                                        {splitResult.splitResult.sentences.length}문장 · 
                                        신뢰도 {Math.round(splitResult.splitResult.confidence * 100)}%
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground line-clamp-2">
                                    {passage.englishPassage.substring(0, 150)}...
                                  </div>
                                </div>

                                {/* 액션 버튼 */}
                                <div className="flex items-center gap-1">
                                  {hasSplitResult && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 px-2",
                                        isPreviewOpen ? "bg-blue-100 text-blue-700" : ""
                                      )}
                                      onClick={() => toggleSplitPreview(key)}
                                    >
                                      {isPreviewOpen ? (
                                        <>
                                          <EyeOff className="w-4 h-4 mr-1" />
                                          숨기기
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-4 h-4 mr-1" />
                                          결과 보기
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  {splitResult && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleResplit(sheet.sheetName, passage)}
                                      disabled={splitResult.isLoading}
                                    >
                                      <RotateCcw className={cn(
                                        "w-4 h-4",
                                        splitResult.isLoading && "animate-spin"
                                      )} />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* 문장 분리 결과 미리보기 */}
                              {isPreviewOpen && splitResult?.splitResult && (
                                <div className="border-t border-green-200 p-3 bg-gradient-to-b from-green-50 to-white">
                                  <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      문장 분리 결과
                                    </span>
                                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                      {splitResult.splitResult.method}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {splitResult.splitResult.sentences.map((sentence, idx) => (
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
                                            {sentence.issues && sentence.issues.length > 0 && (
                                              <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                {sentence.issues.join(', ')}
                                              </div>
                                            )}
                                          </div>
                                          <span className={cn(
                                            "text-xs px-2 py-0.5 rounded",
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
                                  
                                  {/* 번역 상태 */}
                                  {splitResult.translationStatus && (
                                    <div className={cn(
                                      "mt-3 p-3 rounded-lg border",
                                      splitResult.translationStatus.quality === 'good' ? 'bg-green-50 border-green-200' :
                                      splitResult.translationStatus.quality === 'suspicious' ? 'bg-yellow-50 border-yellow-200' : 
                                      'bg-orange-50 border-orange-200'
                                    )}>
                                      <div className="text-xs font-medium mb-1">📝 번역 상태</div>
                                      <div className="text-xs text-muted-foreground">
                                        영어 {splitResult.translationStatus.sentenceCount.english}문장 / 
                                        한글 {splitResult.translationStatus.sentenceCount.korean}문장
                                        {splitResult.translationStatus.alignment === 'perfect' ? ' ✅ 매칭' : ' ⚠️ 불일치'}
                                      </div>
                                      {splitResult.translationStatus.signals.length > 0 && (
                                        <div className="text-xs text-orange-600 mt-1">
                                          ⚠️ {splitResult.translationStatus.signals.join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* 🚨 관리자 알림: 한글 품질 문제 (needsReview가 true인 항목만) */}
                                  {(() => {
                                    const criticalIssues = splitResult.koreanIssues?.filter(issue => issue.needsReview) || []
                                    const infoIssues = splitResult.koreanIssues?.filter(issue => !issue.needsReview) || []
                                    
                                    return (
                                      <>
                                        {/* 긴급 검토 필요 항목 */}
                                        {criticalIssues.length > 0 && (
                                          <div className="mt-3 p-4 bg-amber-50 border-2 border-amber-400 rounded-lg">
                                            <div className="flex items-center gap-2 mb-2">
                                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                                              <span className="font-bold text-amber-800">
                                                ⚠️ 관리자 검토 필요
                                              </span>
                                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                                {criticalIssues.length}건
                                              </span>
                                            </div>
                                            
                                            <div className="space-y-2">
                                              {criticalIssues.map((issue, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm bg-white p-2 rounded border border-amber-200">
                                                  <span className={cn(
                                                    "px-2 py-0.5 rounded text-xs font-medium flex-shrink-0",
                                                    issue.type === 'missing' ? 'bg-red-100 text-red-700' :
                                                    issue.type === 'mismatch' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-orange-100 text-orange-700'
                                                  )}>
                                                    {issue.type === 'missing' ? '누락' :
                                                     issue.type === 'mismatch' ? '불일치' : '주의'}
                                                  </span>
                                                  <span className="text-amber-800 flex-1">{issue.description}</span>
                                                  {issue.severity === 'high' && (
                                                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                                      긴급
                                                    </span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                            
                                            <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                                              <span>💡</span>
                                              <span>원본 구글시트의 한글 번역을 확인해주세요.</span>
                                            </p>
                                          </div>
                                        )}
                                        
                                        {/* 참고용 알림 (접을 수 있음) */}
                                        {infoIssues.length > 0 && (
                                          <details className="mt-2">
                                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                              📋 참고 정보 ({infoIssues.length}건) - 클릭하여 펼치기
                                            </summary>
                                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                                              {infoIssues.map((issue, idx) => (
                                                <div key={idx} className="text-gray-600">
                                                  • {issue.description}
                                                </div>
                                              ))}
                                            </div>
                                          </details>
                                        )}
                                      </>
                                    )
                                  })()}
                                </div>
                              )}

                              {/* 에러 표시 (상세 정보 + 원본 지문 미리보기) */}
                              {splitResult?.error && (
                                <div className="border-t-2 border-destructive/50 bg-gradient-to-b from-red-50 to-white">
                                  {/* 에러 헤더 */}
                                  <div className="p-4 bg-red-50 border-b border-red-200">
                                    <div className="flex items-start gap-3">
                                      <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                                      <div className="flex-1">
                                        <div className="font-bold text-destructive text-base">
                                          ❌ AI 처리 실패 - 지문 {passage.number}
                                        </div>
                                        <div className="text-sm text-destructive/80 mt-1">
                                          {splitResult.error}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* 원본 지문 미리보기 */}
                                  <div className="p-4 space-y-4">
                                    <details className="group" open>
                                      <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                                        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                                        📝 원본 지문 확인
                                      </summary>
                                      <div className="mt-3 space-y-3 pl-6">
                                        {/* 영어 원문 */}
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                          <div className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                                            🇺🇸 영어 원문
                                          </div>
                                          <div className="text-sm text-gray-800 leading-relaxed max-h-32 overflow-y-auto">
                                            {passage.englishPassage}
                                          </div>
                                        </div>
                                        
                                        {/* 한글 번역 */}
                                        {passage.koreanTranslation && (
                                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                            <div className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                                              🇰🇷 한글 번역
                                            </div>
                                            <div className="text-sm text-gray-800 leading-relaxed max-h-32 overflow-y-auto">
                                              {passage.koreanTranslation}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </details>
                                    
                                    {/* 에러 원인 분석 */}
                                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                      <div className="text-xs font-medium text-amber-800 mb-2">
                                        ⚠️ 에러 원인 분석
                                      </div>
                                      <div className="text-sm text-amber-700">
                                        {splitResult.error.includes('한글') ? (
                                          <>
                                            <p>AI가 분리 과정에서 한글 번역을 원본과 다르게 변형했습니다.</p>
                                            <ul className="mt-2 text-xs list-disc list-inside space-y-1">
                                              <li>한글 번역에 특수문자/이모지가 있을 수 있음</li>
                                              <li>AI가 맞춤법을 &quot;교정&quot;하려고 시도했을 수 있음</li>
                                              <li>문장 부호나 띄어쓰기 차이</li>
                                            </ul>
                                          </>
                                        ) : splitResult.error.includes('영어') || splitResult.error.includes('원문') ? (
                                          <>
                                            <p>AI가 분리 과정에서 영어 원문을 변형했습니다.</p>
                                            <ul className="mt-2 text-xs list-disc list-inside space-y-1">
                                              <li>철자 &quot;교정&quot; 시도</li>
                                              <li>문장 부호 변경</li>
                                              <li>공백 처리 차이</li>
                                            </ul>
                                          </>
                                        ) : (
                                          <p>AI 처리 중 예상치 못한 오류가 발생했습니다.</p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* 해결 방법 */}
                                    {splitResult.aiError?.solution && (
                                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="text-xs font-medium text-blue-800 mb-1">
                                          💡 해결 방법
                                        </div>
                                        <div className="text-sm text-blue-700">
                                          {splitResult.aiError.solution}
                                        </div>
                                        {splitResult.aiError?.alternativeModel && (
                                          <div className="text-xs text-blue-600 mt-2">
                                            🔄 추천 대안 모델: <strong>{splitResult.aiError.alternativeModel}</strong>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* 액션 버튼 */}
                                    <div className="flex items-center gap-2 pt-2">
                                      <Button
                                        variant="default"
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                        onClick={() => handleResplit(sheet.sheetName, passage)}
                                      >
                                        <RotateCcw className="w-4 h-4 mr-1" />
                                        재시도
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-gray-600 border-gray-300"
                                        onClick={() => {
                                          // 에러 결과 제거 (건너뛰기)
                                          setSplitResults(prev => {
                                            const newResults = { ...prev }
                                            delete newResults[key]
                                            return newResults
                                          })
                                          toast.info(`지문 ${passage.number}을(를) 건너뛰었습니다`)
                                        }}
                                      >
                                        건너뛰기
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-gray-500"
                                        onClick={() => {
                                          // 선택 해제
                                          handleTogglePassage(sheet.sheetName, passage.number)
                                          setSplitResults(prev => {
                                            const newResults = { ...prev }
                                            delete newResults[key]
                                            return newResults
                                          })
                                          toast.info(`지문 ${passage.number} 선택이 해제되었습니다`)
                                        }}
                                      >
                                        선택 해제
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 등록 버튼 */}
          <Button
            onClick={handleRegister}
            disabled={getSelectedCount() === 0 || isRegistering}
            className={cn(
              'w-full h-12 text-base',
              getSelectedCount() > 0
                ? 'bg-primary hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {isRegistering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                교재 등록 중...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                교재 등록 ({getSelectedCount()}개 지문
                {getSplitCount() > 0 && `, ${getTotalSentences()}개 문장`})
              </>
            )}
          </Button>

          {/* 문장 분리 안내 */}
          {getSelectedCount() > 0 && getSplitCount() < getSelectedCount() && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
              <p className="text-sm text-amber-800">
                💡 <strong>선택된 지문 문장 분리</strong> 버튼을 먼저 클릭하세요!
              </p>
              <p className="text-xs text-amber-600 mt-1">
                문장 분리를 하지 않으면 문장 단위 데이터 생성이 불가능합니다.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
