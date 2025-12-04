'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'
import { ModelId, SentenceSplitResult, TranslationStatus, KoreanIssue, AIErrorResponse } from '@/types'

// ============================================
// 타입 정의
// ============================================

export interface SheetPassage {
  number: string
  englishPassage: string
  koreanTranslation: string
}

export interface ParsedSheet {
  sheetName: string
  gid: string
  passages: SheetPassage[]
}

export interface SheetInfo {
  fileName: string
  sheetId: string
  sheets: ParsedSheet[]
}

export interface PassageSplitResult {
  passageNumber: string
  sheetName: string
  splitResult?: SentenceSplitResult
  translationStatus?: TranslationStatus
  koreanIssues?: KoreanIssue[]
  aiError?: AIErrorResponse
  isLoading: boolean
  error?: string
}

// Context 타입
interface SheetImportContextType {
  // 시트 정보
  googleSheetUrl: string
  setGoogleSheetUrl: (url: string) => void
  sheetInfo: SheetInfo | null
  setSheetInfo: (info: SheetInfo | null) => void
  isFetching: boolean
  error: string | null
  
  // 선택 상태
  selectedItems: Record<string, string[]>
  setSelectedItems: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  expandedUnits: Record<string, boolean>
  setExpandedUnits: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  
  // 분리 설정
  splitModel: ModelId
  setSplitModel: (model: ModelId) => void
  splitMode: 'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel'
  setSplitMode: (mode: 'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel') => void
  
  // 분리 결과
  splitResults: Record<string, PassageSplitResult>
  setSplitResults: React.Dispatch<React.SetStateAction<Record<string, PassageSplitResult>>>
  isSplitting: boolean
  splitProgress: { current: number; total: number; currentPassage: string }
  showSplitSummary: boolean
  setShowSplitSummary: (show: boolean) => void
  
  // 선택된 지문 (우측 패널용)
  selectedPassageKey: string | null
  setSelectedPassageKey: (key: string | null) => void
  
  // 함수들
  handleFetchSheet: () => Promise<void>
  handleSplitSelected: () => Promise<void>
  handleResplit: (sheetName: string, passage: SheetPassage) => Promise<void>
  handleToggleUnit: (sheet: ParsedSheet) => void
  handleTogglePassage: (sheetName: string, passageNumber: string) => void
  handleToggleAllPassages: () => void
  clearPassageResult: (key: string) => void
  
  // 통계 (전체)
  getSelectedCount: () => number
  getSplitCount: () => number
  getTotalSentences: () => number
  getAverageConfidence: () => number
  getAIErrorCount: () => number
  getAIProcessedCount: () => number
  getKoreanIssueCount: () => number
  getTotalKoreanIssues: () => number
  
  // 통계 (현재 선택된 지문 기준)
  getSelectedSplitCount: () => number
  getSelectedTotalSentences: () => number
  getSelectedAverageConfidence: () => number
  getSelectedErrorCount: () => number
  
  // 헬퍼
  getPassageByKey: (key: string) => { sheetName: string; passage: SheetPassage } | null
  
  // 업데이트 모드 (덮어쓰기 시 localStorage 복구 안함)
  isUpdateMode: boolean
  setIsUpdateMode: (isUpdate: boolean) => void
}

const SheetImportContext = createContext<SheetImportContextType | null>(null)

// ============================================
// localStorage 키
// ============================================
const getStorageKey = (sheetId: string) => `split-results-${sheetId}`

// ============================================
// Provider
// ============================================

export function SheetImportProvider({ children }: { children: ReactNode }) {
  // 시트 정보
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [sheetInfo, setSheetInfo] = useState<SheetInfo | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // 선택 상태
  const [selectedItems, setSelectedItems] = useState<Record<string, string[]>>({})
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})
  
  // 분리 설정 (localStorage에서 초기값 로드)
  const [splitModel, setSplitModel] = useState<ModelId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('splitModel') as ModelId) || 'gemini-2.0-flash'
    }
    return 'gemini-2.0-flash'
  })
  const [splitMode, setSplitMode] = useState<'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('splitMode')
      if (saved && ['regex', 'ai', 'hybrid', 'ai-verify', 'parallel'].includes(saved)) {
        return saved as 'regex' | 'ai' | 'hybrid' | 'ai-verify' | 'parallel'
      }
    }
    return 'parallel'
  })
  
  // 분리 결과
  const [splitResults, setSplitResults] = useState<Record<string, PassageSplitResult>>({})
  const [isSplitting, setIsSplitting] = useState(false)
  const [splitProgress, setSplitProgress] = useState({ current: 0, total: 0, currentPassage: '' })
  const [showSplitSummary, setShowSplitSummary] = useState(false)
  
  // 선택된 지문 (우측 패널용)
  const [selectedPassageKey, setSelectedPassageKey] = useState<string | null>(null)
  
  // 업데이트 모드 (덮어쓰기 시 localStorage 복구 안함)
  const [isUpdateMode, setIsUpdateMode] = useState(false)

  // ============================================
  // 🛡️ beforeunload 경고 (작업 중 이탈 방지)
  // ============================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSplitting) {
        e.preventDefault()
        e.returnValue = '' // 브라우저 기본 경고 메시지 표시
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isSplitting])

  // ============================================
  // 💾 localStorage 저장/복구
  // ============================================
  
  // 분리 결과가 변경되면 localStorage에 저장
  useEffect(() => {
    if (sheetInfo && Object.keys(splitResults).length > 0) {
      const key = getStorageKey(sheetInfo.sheetId)
      localStorage.setItem(key, JSON.stringify(splitResults))
    }
  }, [splitResults, sheetInfo])

  // 시트 로드 시 localStorage에서 복구 (업데이트 모드 제외)
  useEffect(() => {
    if (sheetInfo && !isUpdateMode) {
      const key = getStorageKey(sheetInfo.sheetId)
      const saved = localStorage.getItem(key)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const restoredCount = Object.keys(parsed).length
          if (restoredCount > 0) {
            setSplitResults(parsed)
            toast.success(`✅ 이전 분리 결과 복구됨 (${restoredCount}개 지문)`)
          }
        } catch {
          // 파싱 실패 시 무시
        }
      }
    }
  }, [sheetInfo, isUpdateMode])

  // ============================================
  // 시트 조회
  // ============================================
  const handleFetchSheet = useCallback(async () => {
    if (!googleSheetUrl.trim() || isFetching) return

    setIsFetching(true)
    setError(null)
    setSheetInfo(null)
    setSplitResults({})
    setShowSplitSummary(false)
    setSelectedPassageKey(null)
    
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
  }, [googleSheetUrl, isFetching])

  // ============================================
  // 문장 분리 실행 (단일)
  // ============================================
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
          koreanText: passage.koreanTranslation,
          model: splitModel,
          mode: splitMode,
          includeTranslationAnalysis: true,
        })
      })

      const data = await response.json()
      
      if (!response.ok || !data.success) {
        return {
          passageNumber: passage.number,
          sheetName,
          isLoading: false,
          error: data.error || 'API 요청 실패',
          aiError: data.aiError,
        }
      }

      return {
        passageNumber: passage.number,
        sheetName,
        splitResult: {
          sentences: data.sentences,
          confidence: data.confidence,
          method: data.method,
          model: data.model,
          warnings: data.warnings,
          koreanIssues: data.koreanIssues,
        },
        translationStatus: data.translationStatus,
        koreanIssues: data.koreanIssues,
        isLoading: false,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      
      return {
        passageNumber: passage.number,
        sheetName,
        isLoading: false,
        error: errorMessage,
      }
    }
  }, [splitModel, splitMode])

  // ============================================
  // 선택된 지문들 문장 분리
  // ============================================
  const handleSplitSelected = useCallback(async () => {
    if (!sheetInfo || isSplitting) return

    const passagesToSplit: { sheetName: string; passage: SheetPassage; key: string }[] = []
    
    for (const [sheetName, passageNumbers] of Object.entries(selectedItems)) {
      const sheet = sheetInfo.sheets.find(s => s.sheetName === sheetName)
      if (!sheet) continue

      for (const passageNumber of passageNumbers) {
        const passage = sheet.passages.find(p => p.number === passageNumber)
        if (!passage) continue
        
        const key = `${sheetName}-${passageNumber}`
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
    const BATCH_SIZE = 10
    let completedCount = 0

    for (let batchStart = 0; batchStart < passagesToSplit.length; batchStart += BATCH_SIZE) {
      const batch = passagesToSplit.slice(batchStart, batchStart + BATCH_SIZE)
      
      batch.forEach(({ sheetName, passage, key }) => {
        newResults[key] = { 
          passageNumber: passage.number, 
          sheetName, 
          isLoading: true 
        }
      })
      setSplitResults({ ...newResults })
      
      setSplitProgress({ 
        current: completedCount, 
        total: passagesToSplit.length, 
        currentPassage: `배치 처리 중 (${batch.length}개 동시)` 
      })

      const batchResults = await Promise.allSettled(
        batch.map(({ sheetName, passage }) => splitPassage(sheetName, passage))
      )

      batch.forEach(({ sheetName, passage, key }, index) => {
        const result = batchResults[index]
        if (result.status === 'fulfilled') {
          newResults[key] = result.value
          if (result.value.error) {
            setSelectedPassageKey(key)
          }
        } else {
          newResults[key] = {
            passageNumber: passage.number,
            sheetName,
            isLoading: false,
            error: result.reason?.message || '처리 실패',
          }
          setSelectedPassageKey(key)
        }
        completedCount++
      })
      
      setSplitResults({ ...newResults })
      setSplitProgress({ 
        current: completedCount, 
        total: passagesToSplit.length, 
        currentPassage: `완료: ${completedCount}/${passagesToSplit.length}` 
      })

      batch.forEach(({ sheetName }) => {
        setExpandedUnits(prev => ({ ...prev, [sheetName]: true }))
      })
    }

    setIsSplitting(false)
    setSplitProgress({ current: 0, total: 0, currentPassage: '' })
    setShowSplitSummary(true)
  }, [sheetInfo, isSplitting, selectedItems, splitResults, splitPassage])

  // ============================================
  // 단일 지문 재시도
  // ============================================
  const handleResplit = useCallback(async (sheetName: string, passage: SheetPassage) => {
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
    
    setSelectedPassageKey(key)
    
    if (result.error) {
      toast.error(`❌ 재시도 실패 - 지문 ${passage.number}`, {
        description: result.error,
      })
    } else {
      toast.success(`✅ 재시도 성공 - 지문 ${passage.number}`)
    }
  }, [splitPassage])

  // ============================================
  // 토글 함수들
  // ============================================
  const handleToggleUnit = useCallback((sheet: ParsedSheet) => {
    const allPassages = sheet.passages.map(p => p.number)
    const currentSelected = selectedItems[sheet.sheetName] || []

    if (currentSelected.length === allPassages.length) {
      setSelectedItems(prev => {
        const newItems = { ...prev }
        delete newItems[sheet.sheetName]
        return newItems
      })
    } else {
      setSelectedItems(prev => ({
        ...prev,
        [sheet.sheetName]: [...allPassages],
      }))
    }
  }, [selectedItems])

  const handleTogglePassage = useCallback((sheetName: string, passageNumber: string) => {
    setSelectedItems(prev => {
      const currentSelected = prev[sheetName] || []
      const newSelected = currentSelected.includes(passageNumber)
        ? currentSelected.filter(p => p !== passageNumber)
        : [...currentSelected, passageNumber]

      if (newSelected.length === 0) {
        const newItems = { ...prev }
        delete newItems[sheetName]
        return newItems
      }

      return { ...prev, [sheetName]: newSelected }
    })
  }, [])

  const handleToggleAllPassages = useCallback(() => {
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
  }, [sheetInfo, selectedItems])

  const clearPassageResult = useCallback((key: string) => {
    setSplitResults(prev => {
      const newResults = { ...prev }
      delete newResults[key]
      return newResults
    })
  }, [])

  // ============================================
  // 통계 함수들
  // ============================================
  const getSelectedCount = useCallback(() =>
    Object.values(selectedItems).reduce((sum, arr) => sum + arr.length, 0)
  , [selectedItems])

  const getSplitCount = useCallback(() => 
    Object.values(splitResults).filter(r => r.splitResult && !r.error).length
  , [splitResults])

  const getTotalSentences = useCallback(() =>
    Object.values(splitResults).reduce(
      (sum, r) => sum + (r.splitResult?.sentences.length || 0), 
      0
    )
  , [splitResults])

  const getAverageConfidence = useCallback(() => {
    const results = Object.values(splitResults).filter(r => r.splitResult)
    if (results.length === 0) return 0
    const sum = results.reduce((s, r) => s + (r.splitResult?.confidence || 0), 0)
    return Math.round((sum / results.length) * 100)
  }, [splitResults])

  const getAIErrorCount = useCallback(() =>
    Object.values(splitResults).filter(r => r.error).length
  , [splitResults])

  const getAIProcessedCount = useCallback(() =>
    Object.values(splitResults).filter(r => 
      r.splitResult?.method === 'parallel' || 
      r.splitResult?.method === 'ai-verify' ||
      r.splitResult?.method === 'ai'
    ).length
  , [splitResults])

  const getKoreanIssueCount = useCallback(() => 
    Object.values(splitResults).filter(r => r.koreanIssues && r.koreanIssues.length > 0).length
  , [splitResults])

  const getTotalKoreanIssues = useCallback(() =>
    Object.values(splitResults).reduce(
      (sum, r) => sum + (r.koreanIssues?.length || 0),
      0
    )
  , [splitResults])

  // ============================================
  // 선택된 지문 기준 통계 함수들 (현재 선택)
  // ============================================
  const getSelectedKeys = useCallback(() => {
    const keys: string[] = []
    Object.entries(selectedItems).forEach(([sheetName, passageNumbers]) => {
      passageNumbers.forEach(num => {
        keys.push(`${sheetName}-${num}`)
      })
    })
    return keys
  }, [selectedItems])

  const getSelectedSplitCount = useCallback(() => {
    const selectedKeys = getSelectedKeys()
    return selectedKeys.filter(key => 
      splitResults[key]?.splitResult && !splitResults[key]?.error
    ).length
  }, [getSelectedKeys, splitResults])

  const getSelectedTotalSentences = useCallback(() => {
    const selectedKeys = getSelectedKeys()
    return selectedKeys.reduce((sum, key) => 
      sum + (splitResults[key]?.splitResult?.sentences.length || 0), 
      0
    )
  }, [getSelectedKeys, splitResults])

  const getSelectedAverageConfidence = useCallback(() => {
    const selectedKeys = getSelectedKeys()
    const results = selectedKeys
      .map(key => splitResults[key])
      .filter(r => r?.splitResult)
    if (results.length === 0) return 0
    const sum = results.reduce((s, r) => s + (r.splitResult?.confidence || 0), 0)
    return Math.round((sum / results.length) * 100)
  }, [getSelectedKeys, splitResults])

  const getSelectedErrorCount = useCallback(() => {
    const selectedKeys = getSelectedKeys()
    return selectedKeys.filter(key => splitResults[key]?.error).length
  }, [getSelectedKeys, splitResults])

  // ============================================
  // 헬퍼 함수
  // ============================================
  const getPassageByKey = useCallback((key: string) => {
    if (!sheetInfo) return null
    const [sheetName, passageNumber] = key.split('-')
    const sheet = sheetInfo.sheets.find(s => s.sheetName === sheetName)
    if (!sheet) return null
    const passage = sheet.passages.find(p => p.number === passageNumber)
    if (!passage) return null
    return { sheetName, passage }
  }, [sheetInfo])

  // ============================================
  // Context Value
  // ============================================
  const value: SheetImportContextType = {
    googleSheetUrl,
    setGoogleSheetUrl,
    sheetInfo,
    setSheetInfo,
    isFetching,
    error,
    selectedItems,
    setSelectedItems,
    expandedUnits,
    setExpandedUnits,
    splitModel,
    setSplitModel,
    splitMode,
    setSplitMode,
    splitResults,
    setSplitResults,
    isSplitting,
    splitProgress,
    showSplitSummary,
    setShowSplitSummary,
    selectedPassageKey,
    setSelectedPassageKey,
    handleFetchSheet,
    handleSplitSelected,
    handleResplit,
    handleToggleUnit,
    handleTogglePassage,
    handleToggleAllPassages,
    clearPassageResult,
    getSelectedCount,
    getSplitCount,
    getTotalSentences,
    getAverageConfidence,
    getAIErrorCount,
    getAIProcessedCount,
    getKoreanIssueCount,
    getTotalKoreanIssues,
    getSelectedSplitCount,
    getSelectedTotalSentences,
    getSelectedAverageConfidence,
    getSelectedErrorCount,
    getPassageByKey,
    isUpdateMode,
    setIsUpdateMode,
  }

  return (
    <SheetImportContext.Provider value={value}>
      {children}
    </SheetImportContext.Provider>
  )
}

export function useSheetImport() {
  const context = useContext(SheetImportContext)
  if (!context) {
    throw new Error('useSheetImport must be used within a SheetImportProvider')
  }
  return context
}
