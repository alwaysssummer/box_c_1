'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'
import type { ModelId } from '@/types'
import type { Passage, DataType, GeneratedData } from '@/types/database'

// ============================================
// 타입 정의
// ============================================

export interface PassageForGeneration {
  id: string
  name: string
  content: string | null
  korean_translation: string | null
  unit: {
    id: string
    name: string
    textbook: {
      id: string
      name: string
      group: {
        id: string
        name: string
      }
    }
  }
}

export interface DataTypeForGeneration {
  id: string
  name: string
  target: 'passage' | 'sentence'
  prompt_id: string | null
  difficulty: 'simple' | 'medium' | 'complex'
  recommended_model: string
}

export interface GenerationResult {
  passageId: string
  dataTypeId: string
  sentenceId?: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  result?: unknown
  error?: string
  modelUsed?: string
  confidence?: number
  responseTime?: number
  inputTokens?: number
  outputTokens?: number
}

// Context 타입
interface DataGenerateContextType {
  // 지문 목록
  passages: PassageForGeneration[]
  isLoadingPassages: boolean
  loadPassages: () => Promise<void>
  
  // 데이터 유형 목록
  dataTypes: DataTypeForGeneration[]
  isLoadingDataTypes: boolean
  loadDataTypes: () => Promise<void>
  
  // 선택 상태
  selectedPassageIds: string[]
  setSelectedPassageIds: React.Dispatch<React.SetStateAction<string[]>>
  selectedDataTypeId: string | null
  setSelectedDataTypeId: (id: string | null) => void
  
  // 생성 설정
  model: ModelId
  setModel: (model: ModelId) => void
  
  // 생성 결과
  generationResults: Record<string, GenerationResult> // key: `${passageId}-${dataTypeId}`
  setGenerationResults: React.Dispatch<React.SetStateAction<Record<string, GenerationResult>>>
  
  // 생성 상태
  isGenerating: boolean
  generationProgress: { current: number; total: number; currentPassage: string }
  
  // 함수들
  handleGenerateSelected: () => Promise<void>
  handleRegenerateOne: (passageId: string) => Promise<void>
  clearResults: () => void
  
  // 토글 함수들
  togglePassage: (passageId: string) => void
  toggleAllPassages: () => void
  
  // 통계 함수들
  getSelectedCount: () => number
  getCompletedCount: () => number
  getFailedCount: () => number
  getAverageConfidence: () => number
  getTotalTokens: () => { input: number; output: number }
  
  // 선택된 결과 조회
  selectedResultKey: string | null
  setSelectedResultKey: (key: string | null) => void
  getResultByKey: (key: string) => GenerationResult | null
}

const DataGenerateContext = createContext<DataGenerateContextType | null>(null)

// ============================================
// localStorage 키
// ============================================
const STORAGE_KEY_RESULTS = 'data-generate-results'
const STORAGE_KEY_MODEL = 'data-generate-model'

// ============================================
// Provider
// ============================================

export function DataGenerateProvider({ children }: { children: ReactNode }) {
  // 지문 목록
  const [passages, setPassages] = useState<PassageForGeneration[]>([])
  const [isLoadingPassages, setIsLoadingPassages] = useState(false)
  
  // 데이터 유형 목록
  const [dataTypes, setDataTypes] = useState<DataTypeForGeneration[]>([])
  const [isLoadingDataTypes, setIsLoadingDataTypes] = useState(false)
  
  // 선택 상태
  const [selectedPassageIds, setSelectedPassageIds] = useState<string[]>([])
  const [selectedDataTypeId, setSelectedDataTypeId] = useState<string | null>(null)
  
  // 생성 설정
  const [model, setModel] = useState<ModelId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(STORAGE_KEY_MODEL) as ModelId) || 'gpt-4o-mini'
    }
    return 'gpt-4o-mini'
  })
  
  // 생성 결과
  const [generationResults, setGenerationResults] = useState<Record<string, GenerationResult>>({})
  
  // 생성 상태
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, currentPassage: '' })
  
  // 선택된 결과
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(null)

  // ============================================
  // 🛡️ beforeunload 경고 (작업 중 이탈 방지)
  // ============================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isGenerating])

  // ============================================
  // 💾 localStorage 저장/복구
  // ============================================
  
  // 모델 변경 시 localStorage 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MODEL, model)
    }
  }, [model])

  // 결과 변경 시 localStorage 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(generationResults).length > 0) {
      localStorage.setItem(STORAGE_KEY_RESULTS, JSON.stringify(generationResults))
    }
  }, [generationResults])

  // 초기 로드 시 localStorage에서 복구
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_RESULTS)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const count = Object.keys(parsed).length
          if (count > 0) {
            setGenerationResults(parsed)
            toast.success(`✅ 이전 생성 결과 복구됨 (${count}개)`)
          }
        } catch {
          // 파싱 실패 시 무시
        }
      }
    }
  }, [])

  // ============================================
  // 데이터 로드 함수들
  // ============================================
  
  const loadPassages = useCallback(async () => {
    setIsLoadingPassages(true)
    try {
      const response = await fetch('/api/passages')
      if (!response.ok) throw new Error('Failed to load passages')
      const data = await response.json()
      setPassages(data)
    } catch (error) {
      console.error('Error loading passages:', error)
      toast.error('지문 목록을 불러오는데 실패했습니다')
    } finally {
      setIsLoadingPassages(false)
    }
  }, [])

  const loadDataTypes = useCallback(async () => {
    setIsLoadingDataTypes(true)
    try {
      const response = await fetch('/api/data-types')
      if (!response.ok) throw new Error('Failed to load data types')
      const data = await response.json()
      // prompt_id가 있는 것만 필터링 (프롬프트가 연결된 것만)
      const validDataTypes = data.filter((dt: DataTypeForGeneration) => dt.prompt_id)
      setDataTypes(validDataTypes)
    } catch (error) {
      console.error('Error loading data types:', error)
      toast.error('데이터 유형 목록을 불러오는데 실패했습니다')
    } finally {
      setIsLoadingDataTypes(false)
    }
  }, [])

  // ============================================
  // 단일 데이터 생성
  // ============================================
  const generateOne = useCallback(async (
    passageId: string,
    dataTypeId: string
  ): Promise<GenerationResult> => {
    const key = `${passageId}-${dataTypeId}`
    
    try {
      const response = await fetch('/api/generate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageId,
          dataTypeId,
          model,
        })
      })

      const data = await response.json()
      
      if (!response.ok || !data.success) {
        return {
          passageId,
          dataTypeId,
          status: 'failed',
          error: data.error || 'API 요청 실패',
        }
      }

      return {
        passageId,
        dataTypeId,
        status: 'completed',
        result: data.data?.result,
        modelUsed: data.data?.modelUsed,
        confidence: data.data?.confidence,
        responseTime: data.data?.responseTime,
        inputTokens: data.data?.inputTokens,
        outputTokens: data.data?.outputTokens,
      }
    } catch (error) {
      return {
        passageId,
        dataTypeId,
        status: 'failed',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      }
    }
  }, [model])

  // ============================================
  // 선택된 지문들 데이터 생성
  // ============================================
  const handleGenerateSelected = useCallback(async () => {
    if (!selectedDataTypeId || selectedPassageIds.length === 0 || isGenerating) {
      toast.error('데이터 유형과 지문을 선택해주세요')
      return
    }

    // 이미 완료된 것 제외
    const passagesToGenerate = selectedPassageIds.filter(passageId => {
      const key = `${passageId}-${selectedDataTypeId}`
      const existing = generationResults[key]
      return !existing || existing.status !== 'completed'
    })

    if (passagesToGenerate.length === 0) {
      toast.info('모든 선택된 지문의 데이터가 이미 생성되었습니다')
      return
    }

    setIsGenerating(true)
    setGenerationProgress({ current: 0, total: passagesToGenerate.length, currentPassage: '' })

    const newResults: Record<string, GenerationResult> = { ...generationResults }
    const BATCH_SIZE = 5 // 데이터 생성은 더 적은 배치
    let completedCount = 0

    for (let batchStart = 0; batchStart < passagesToGenerate.length; batchStart += BATCH_SIZE) {
      const batch = passagesToGenerate.slice(batchStart, batchStart + BATCH_SIZE)
      
      // 배치의 모든 항목을 processing으로 표시
      batch.forEach(passageId => {
        const key = `${passageId}-${selectedDataTypeId}`
        newResults[key] = { 
          passageId, 
          dataTypeId: selectedDataTypeId, 
          status: 'processing' 
        }
      })
      setGenerationResults({ ...newResults })

      // 지문 이름 찾기
      const passageNames = batch.map(id => 
        passages.find(p => p.id === id)?.name || id
      ).join(', ')
      
      setGenerationProgress({ 
        current: completedCount, 
        total: passagesToGenerate.length, 
        currentPassage: `처리 중: ${passageNames}` 
      })

      // 배치 병렬 처리
      const batchResults = await Promise.allSettled(
        batch.map(passageId => generateOne(passageId, selectedDataTypeId))
      )

      // 결과 업데이트
      batch.forEach((passageId, index) => {
        const key = `${passageId}-${selectedDataTypeId}`
        const result = batchResults[index]
        
        if (result.status === 'fulfilled') {
          newResults[key] = result.value
          if (result.value.status === 'failed') {
            setSelectedResultKey(key) // 실패 시 상세 보기
          }
        } else {
          newResults[key] = {
            passageId,
            dataTypeId: selectedDataTypeId,
            status: 'failed',
            error: result.reason?.message || '처리 실패',
          }
          setSelectedResultKey(key)
        }
        completedCount++
      })
      
      setGenerationResults({ ...newResults })
      setGenerationProgress({ 
        current: completedCount, 
        total: passagesToGenerate.length, 
        currentPassage: `완료: ${completedCount}/${passagesToGenerate.length}` 
      })
    }

    setIsGenerating(false)
    setGenerationProgress({ current: 0, total: 0, currentPassage: '' })
    
    // 완료 통계
    const completed = Object.values(newResults).filter(r => r.status === 'completed').length
    const failed = Object.values(newResults).filter(r => r.status === 'failed').length
    
    if (failed > 0) {
      toast.warning(`⚠️ 데이터 생성 완료: 성공 ${completed}개, 실패 ${failed}개`)
    } else {
      toast.success(`✅ 데이터 생성 완료: ${completed}개`)
    }
  }, [selectedDataTypeId, selectedPassageIds, isGenerating, generationResults, passages, generateOne])

  // ============================================
  // 단일 재생성
  // ============================================
  const handleRegenerateOne = useCallback(async (passageId: string) => {
    if (!selectedDataTypeId) return
    
    const key = `${passageId}-${selectedDataTypeId}`
    
    setGenerationResults(prev => ({
      ...prev,
      [key]: { passageId, dataTypeId: selectedDataTypeId, status: 'processing' }
    }))

    const result = await generateOne(passageId, selectedDataTypeId)
    
    setGenerationResults(prev => ({
      ...prev,
      [key]: result
    }))
    
    setSelectedResultKey(key)
    
    if (result.status === 'failed') {
      toast.error(`❌ 재생성 실패: ${result.error}`)
    } else {
      toast.success('✅ 재생성 완료')
    }
  }, [selectedDataTypeId, generateOne])

  // ============================================
  // 결과 초기화
  // ============================================
  const clearResults = useCallback(() => {
    setGenerationResults({})
    setSelectedResultKey(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_RESULTS)
    }
    toast.success('생성 결과가 초기화되었습니다')
  }, [])

  // ============================================
  // 토글 함수들
  // ============================================
  const togglePassage = useCallback((passageId: string) => {
    setSelectedPassageIds(prev => 
      prev.includes(passageId)
        ? prev.filter(id => id !== passageId)
        : [...prev, passageId]
    )
  }, [])

  const toggleAllPassages = useCallback(() => {
    if (selectedPassageIds.length === passages.length) {
      setSelectedPassageIds([])
    } else {
      setSelectedPassageIds(passages.map(p => p.id))
    }
  }, [selectedPassageIds.length, passages])

  // ============================================
  // 통계 함수들
  // ============================================
  const getSelectedCount = useCallback(() => selectedPassageIds.length, [selectedPassageIds])

  const getCompletedCount = useCallback(() => 
    Object.values(generationResults).filter(r => r.status === 'completed').length
  , [generationResults])

  const getFailedCount = useCallback(() => 
    Object.values(generationResults).filter(r => r.status === 'failed').length
  , [generationResults])

  const getAverageConfidence = useCallback(() => {
    const completed = Object.values(generationResults).filter(r => r.status === 'completed' && r.confidence)
    if (completed.length === 0) return 0
    const sum = completed.reduce((acc, r) => acc + (r.confidence || 0), 0)
    return Math.round((sum / completed.length) * 100)
  }, [generationResults])

  const getTotalTokens = useCallback(() => {
    const completed = Object.values(generationResults).filter(r => r.status === 'completed')
    return {
      input: completed.reduce((acc, r) => acc + (r.inputTokens || 0), 0),
      output: completed.reduce((acc, r) => acc + (r.outputTokens || 0), 0),
    }
  }, [generationResults])

  const getResultByKey = useCallback((key: string) => {
    return generationResults[key] || null
  }, [generationResults])

  // ============================================
  // Context Value
  // ============================================
  const value: DataGenerateContextType = {
    passages,
    isLoadingPassages,
    loadPassages,
    dataTypes,
    isLoadingDataTypes,
    loadDataTypes,
    selectedPassageIds,
    setSelectedPassageIds,
    selectedDataTypeId,
    setSelectedDataTypeId,
    model,
    setModel,
    generationResults,
    setGenerationResults,
    isGenerating,
    generationProgress,
    handleGenerateSelected,
    handleRegenerateOne,
    clearResults,
    togglePassage,
    toggleAllPassages,
    getSelectedCount,
    getCompletedCount,
    getFailedCount,
    getAverageConfidence,
    getTotalTokens,
    selectedResultKey,
    setSelectedResultKey,
    getResultByKey,
  }

  return (
    <DataGenerateContext.Provider value={value}>
      {children}
    </DataGenerateContext.Provider>
  )
}

export function useDataGenerate() {
  const context = useContext(DataGenerateContext)
  if (!context) {
    throw new Error('useDataGenerate must be used within a DataGenerateProvider')
  }
  return context
}



