'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  FileText, 
  Layers, 
  Play, 
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  AlertCircle
} from 'lucide-react'
import { QuestionTypeSelector } from './QuestionTypeSelector'
import { GenerationPreview } from './GenerationPreview'
import type { QuestionTypeWithBlocks } from '@/types/database'

// 생성 상태
type GenerationState = 'idle' | 'generating' | 'preview' | 'registering' | 'complete'

// 생성 결과 타입
interface GenerationResult {
  passage_id: string
  passage_name: string
  passage_content?: string  // 원본 지문
  unit_name?: string  // 단원명
  textbook_name?: string  // ⭐ 교재명 추가
  success: boolean
  content?: Record<string, unknown>
  error?: string
}

interface OneClickGenerationProps {
  selectedPassageIds: string[]
  onComplete?: () => void  // ⭐ 등록 완료 콜백
}

export function OneClickGeneration({ 
  selectedPassageIds,
  onComplete,
}: OneClickGenerationProps) {
  // 상태
  const [state, setState] = useState<GenerationState>('idle')
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionTypeWithBlocks | null>(null)
  const [passages, setPassages] = useState<Array<{ id: string; name: string; textbook?: string; unit?: string }>>([])
  const [isLoadingPassages, setIsLoadingPassages] = useState(false)
  
  // 생성 진행 상태
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<GenerationResult[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  
  // ⭐ 등록 진행 상태
  const [registerResults, setRegisterResults] = useState<Array<{
    passage_id: string
    passage_name: string
    success: boolean
    error?: string
  }>>([])
  
  // 이탈 경고용 ref
  const isProcessingRef = useRef(false)
  
  // 이탈 경고 (생성 중일 때)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessingRef.current) {
        e.preventDefault()
        e.returnValue = '문제 생성이 진행 중입니다. 페이지를 떠나면 작업이 중단됩니다.'
        return e.returnValue
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
  
  // 선택된 지문 정보 로드
  useEffect(() => {
    const fetchPassages = async () => {
      if (selectedPassageIds.length === 0) {
        setPassages([])
        return
      }
      
      setIsLoadingPassages(true)
      try {
        // 선택된 지문 정보 가져오기
        const response = await fetch(`/api/passages?ids=${selectedPassageIds.join(',')}`)
        if (response.ok) {
          const data = await response.json()
          setPassages(data)
        }
      } catch (error) {
        console.error('Failed to fetch passages:', error)
      } finally {
        setIsLoadingPassages(false)
      }
    }
    
    fetchPassages()
  }, [selectedPassageIds])
  
  // 출제 시작 (⭐ SSE 스트리밍 방식)
  const handleStartGeneration = useCallback(async () => {
    if (!selectedQuestionType || selectedPassageIds.length === 0) return
    
    setState('generating')
    setIsGenerating(true)
    isProcessingRef.current = true
    setProgress({ current: 0, total: selectedPassageIds.length })
    setResults([])
    
    try {
      console.log('[OneClickGeneration] Starting SSE generation with passages:', selectedPassageIds)
      
      const response = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passage_ids: selectedPassageIds,
          question_type_id: selectedQuestionType.id,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Generation failed')
      }
      
      // ⭐ SSE 스트리밍 수신
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('No response body')
      }
      
      let buffer = ''
      const tempResults: GenerationResult[] = []
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'metadata') {
                // 메타데이터 수신
                setProgress({ current: 0, total: data.total })
                console.log('[SSE] Metadata:', data)
              } else if (data.type === 'result') {
                // 결과 수신 (실시간 업데이트!)
                tempResults.push(data)
                setResults([...tempResults])
                setProgress(prev => ({ ...prev, current: tempResults.length }))
                console.log('[SSE] Result:', data)
              } else if (data.type === 'complete') {
                // 완료
                console.log('[SSE] Complete')
                setState('preview')
              } else if (data.type === 'error') {
                // 오류
                console.error('[SSE] Error:', data.error)
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('[SSE] Parse error:', parseError)
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Generation error:', error)
      setState('idle')
    } finally {
      setIsGenerating(false)
      isProcessingRef.current = false
    }
  }, [selectedQuestionType, selectedPassageIds])
  
  // ⭐ 등록 처리 (SSE 스트리밍)
  const handleRegister = useCallback(async (selectedIds: string[]) => {
    const successResults = results.filter(r => r.success && selectedIds.includes(r.passage_id))
    
    if (successResults.length === 0) {
      console.warn('[Register] No results to register')
      return
    }
    
    // 등록 중 상태로 변경
    setState('registering')
    setProgress({ current: 0, total: successResults.length })
    setRegisterResults([])
    
    try {
      console.log('[Register] Starting registration:', successResults.length, 'questions')
      
      const response = await fetch('/api/generate/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_type_id: selectedQuestionType?.id,
          results: successResults,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Registration request failed')
      }
      
      // SSE 스트림 읽기
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }
      
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'metadata') {
                console.log('[Register] Metadata:', data)
              } else if (data.type === 'progress') {
                console.log('[Register] Progress:', data.current, '/', data.total)
                setProgress({ current: data.current, total: data.total })
              } else if (data.type === 'result') {
                console.log('[Register] Result:', data.passage_name, data.success ? '✓' : '✗')
                setRegisterResults(prev => [...prev, data])
              } else if (data.type === 'complete') {
                console.log('[Register] Complete:', data.registered, 'questions registered')
                setState('complete')
                // ⭐ 등록 완료 콜백 호출
                if (onComplete) {
                  setTimeout(() => {
                    onComplete()
                  }, 1500)  // 1.5초 후 문제관리 탭으로 이동
                }
              } else if (data.type === 'error') {
                console.error('[Register] Error:', data.error)
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('[Register] Parse error:', parseError)
            }
          }
        }
      }
      
    } catch (error) {
      console.error('[Register] Error:', error)
      setState('preview') // 오류 시 미리보기로 복귀
    }
  }, [results, selectedQuestionType])
  
  // 다시 출제하기
  const handleReset = useCallback(() => {
    setState('idle')
    setResults([])
    setProgress({ current: 0, total: 0 })
  }, [])
  
  // ⭐ 실패한 항목만 재생성
  const handleRetryFailed = useCallback(async (failedPassageIds: string[]) => {
    if (!selectedQuestionType || failedPassageIds.length === 0) return
    
    setState('generating')
    setIsGenerating(true)
    isProcessingRef.current = true
    setProgress({ current: 0, total: failedPassageIds.length })
    
    // 기존 성공한 결과 유지
    const successResults = results.filter(r => r.success)
    setResults(successResults)
    
    try {
      console.log('[OneClickGeneration] Retrying failed passages:', failedPassageIds)
      
      const response = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passage_ids: failedPassageIds,
          question_type_id: selectedQuestionType.id,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Retry failed')
      }
      
      // SSE 스트리밍 수신
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('No response body')
      }
      
      let buffer = ''
      const retryResults: GenerationResult[] = []
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'metadata') {
                setProgress({ current: 0, total: data.total })
              } else if (data.type === 'result') {
                retryResults.push(data)
                setResults([...successResults, ...retryResults])
                setProgress(prev => ({ ...prev, current: retryResults.length }))
              } else if (data.type === 'complete') {
                setState('preview')
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('[SSE] Parse error:', parseError)
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Retry error:', error)
      setState('preview')
    } finally {
      setIsGenerating(false)
      isProcessingRef.current = false
    }
  }, [selectedQuestionType, results])
  
  // 출제 가능 여부
  const canGenerate = selectedPassageIds.length > 0 && selectedQuestionType !== null
  
  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">문제 출제</h2>
          </div>
          <div className="flex items-center gap-2">
            {state === 'idle' && (
              <Badge variant="outline">
                {selectedPassageIds.length}개 지문 선택됨
              </Badge>
            )}
            {state === 'generating' && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                생성 중...
              </Badge>
            )}
            {state === 'preview' && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                미리보기
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto p-4">
        {/* idle 상태: 지문 목록 + 유형 선택 */}
        {state === 'idle' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* 좌측: 선택된 지문 목록 */}
            <Card className="flex flex-col">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  선택된 지문 ({selectedPassageIds.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                {selectedPassageIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                    <FileText className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">좌측 트리에서 지문을 선택하세요</p>
                  </div>
                ) : isLoadingPassages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="divide-y">
                    {passages.map((passage, index) => (
                      <div key={passage.id} className="px-4 py-2 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{passage.name}</p>
                            {(passage.textbook || passage.unit) && (
                              <p className="text-xs text-muted-foreground truncate font-mono">
                                {passage.textbook && <span>{passage.textbook}</span>}
                                {passage.textbook && passage.unit && <span> &gt; </span>}
                                {passage.unit && <span>{passage.unit}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* 우측: 문제 유형 선택 */}
            <Card className="flex flex-col">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  문제 유형 선택
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0">
                <QuestionTypeSelector
                  selectedId={selectedQuestionType?.id || null}
                  onSelect={setSelectedQuestionType}
                />
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* ⭐ generating + preview + registering 상태: 통합 미리보기 */}
        {(state === 'generating' || state === 'preview' || state === 'registering') && (
          <GenerationPreview
            results={results}
            questionType={selectedQuestionType}
            onRegister={handleRegister}
            onRetry={handleReset}
            onRetryFailed={handleRetryFailed}
            isGenerating={state === 'generating'}
            isRegistering={state === 'registering'}
            registerResults={registerResults}
            passages={passages}
            current={progress.current}
            total={progress.total}
          />
        )}
        
        {/* complete 상태: 완료 */}
        {state === 'complete' && (
          <Card className="max-w-md mx-auto mt-8">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">등록 완료!</h3>
              <p className="text-muted-foreground mb-6">
                {results.filter(r => r.success).length}개의 문제가 등록되었습니다.
              </p>
              <Button onClick={handleReset}>
                새로운 출제하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* 하단: 출제 시작 버튼 (idle 상태에서만) */}
      {state === 'idle' && (
        <div className="p-4 border-t bg-background">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {!canGenerate && (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  {selectedPassageIds.length === 0 
                    ? '지문을 선택하세요' 
                    : '문제 유형을 선택하세요'}
                </span>
              )}
              {canGenerate && (
                <span className="text-green-600">
                  {selectedPassageIds.length}개 지문 × {selectedQuestionType?.name} 출제 준비 완료
                </span>
              )}
            </div>
            <Button 
              onClick={handleStartGeneration}
              disabled={!canGenerate || isGenerating}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  출제 시작
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
