'use client'

/**
 * 원큐 문제 생성 UI
 * 
 * 선택된 지문에 대해 프롬프트 기반으로 문제를 직접 생성합니다.
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Sparkles, 
  Loader2, 
  Check, 
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuestionType {
  id: string
  name: string
  prompt_id: string | null
  question_group?: string | null
}

interface PassageInfo {
  id: string
  name: string
  content: string
  unit_name?: string
  textbook_name?: string
}

interface GenerationResult {
  passageId: string
  passageName: string
  status: 'pending' | 'generating' | 'success' | 'error'
  error?: string
  questionId?: string
}

interface OneClickGenerationProps {
  selectedPassageIds: string[]
}

export function OneClickGeneration({ selectedPassageIds }: OneClickGenerationProps) {
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [passages, setPassages] = useState<PassageInfo[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<GenerationResult[]>([])

  // 프롬프트 기반 문제 유형만 필터링
  const promptBasedTypes = questionTypes.filter(qt => qt.prompt_id)

  // 문제 유형 로드
  const fetchQuestionTypes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/question-types')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setQuestionTypes(data)
      
      // 프롬프트 기반 유형이 있으면 첫 번째 선택
      const promptBased = data.filter((qt: QuestionType) => qt.prompt_id)
      if (promptBased.length > 0 && !selectedTypeId) {
        setSelectedTypeId(promptBased[0].id)
      }
    } catch (error) {
      console.error('Error fetching question types:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedTypeId])

  // 선택된 지문 정보 로드
  const fetchPassages = useCallback(async () => {
    if (selectedPassageIds.length === 0) {
      setPassages([])
      return
    }

    try {
      const passagePromises = selectedPassageIds.map(async (id) => {
        const response = await fetch(`/api/passages/${id}`)
        if (!response.ok) return null
        return response.json()
      })
      
      const results = await Promise.all(passagePromises)
      setPassages(results.filter(Boolean))
    } catch (error) {
      console.error('Error fetching passages:', error)
    }
  }, [selectedPassageIds])

  useEffect(() => {
    fetchQuestionTypes()
  }, [fetchQuestionTypes])

  useEffect(() => {
    fetchPassages()
  }, [fetchPassages])

  // 문제 생성
  const handleGenerate = async () => {
    if (!selectedTypeId || selectedPassageIds.length === 0) return

    const selectedType = questionTypes.find(qt => qt.id === selectedTypeId)
    if (!selectedType?.prompt_id) {
      alert('프롬프트 기반 문제 유형을 선택해주세요.')
      return
    }

    setIsGenerating(true)
    
    // 결과 초기화
    const initialResults: GenerationResult[] = passages.map(p => ({
      passageId: p.id,
      passageName: p.name,
      status: 'pending',
    }))
    setResults(initialResults)

    // 순차적으로 생성
    for (let i = 0; i < passages.length; i++) {
      const passage = passages[i]
      
      // 상태 업데이트: generating
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'generating' } : r
      ))

      try {
        const response = await fetch('/api/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passageId: passage.id,
            questionTypeId: selectedTypeId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Generation failed')
        }

        const data = await response.json()
        
        // 상태 업데이트: success
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'success', questionId: data.id } : r
        ))
      } catch (error) {
        // 상태 업데이트: error
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } : r
        ))
      }
    }

    setIsGenerating(false)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500" />
          🚀 원큐 문제 생성
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 선택된 지문 현황 */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">선택된 지문</span>
            <Badge variant={selectedPassageIds.length > 0 ? 'default' : 'secondary'}>
              {selectedPassageIds.length}개
            </Badge>
          </div>
          {selectedPassageIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              좌측 트리에서 지문을 선택해주세요.
            </p>
          ) : (
            <div className="max-h-32 overflow-auto space-y-1">
              {passages.map(p => (
                <div key={p.id} className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {p.textbook_name && <span className="text-slate-400">[{p.textbook_name}]</span>}
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 문제 유형 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">문제 유형 선택</label>
          <Select
            value={selectedTypeId}
            onValueChange={setSelectedTypeId}
            disabled={isLoading || isGenerating}
          >
            <SelectTrigger>
              <SelectValue placeholder="문제 유형 선택..." />
            </SelectTrigger>
            <SelectContent>
              {promptBasedTypes.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  프롬프트 기반 문제 유형이 없습니다.
                  <br />
                  <span className="text-xs">설정 &gt; 문제 유형에서 추가해주세요.</span>
                </div>
              ) : (
                promptBasedTypes.map(qt => (
                  <SelectItem key={qt.id} value={qt.id}>
                    <div className="flex items-center gap-2">
                      <span>🚀</span>
                      <span>{qt.name}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            프롬프트 기반(🚀) 문제 유형만 선택 가능합니다.
          </p>
        </div>

        {/* 생성 버튼 */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !selectedTypeId || selectedPassageIds.length === 0}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              생성 중... ({successCount + errorCount}/{passages.length})
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {selectedPassageIds.length}개 지문 문제 생성
            </>
          )}
        </Button>

        {/* 생성 결과 */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">생성 결과</span>
              <div className="flex gap-2">
                {successCount > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    성공 {successCount}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    실패 {errorCount}
                  </Badge>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-auto space-y-1 border rounded-lg p-2">
              {results.map((result, idx) => (
                <div 
                  key={result.passageId}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded text-sm',
                    result.status === 'success' && 'bg-green-50',
                    result.status === 'error' && 'bg-red-50',
                    result.status === 'generating' && 'bg-blue-50',
                    result.status === 'pending' && 'bg-slate-50',
                  )}
                >
                  <span className="w-6 text-center text-xs text-muted-foreground">
                    {idx + 1}
                  </span>
                  {result.status === 'pending' && (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                  )}
                  {result.status === 'generating' && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                  {result.status === 'success' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {result.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="flex-1 truncate">{result.passageName}</span>
                  {result.status === 'error' && result.error && (
                    <span className="text-xs text-red-500 truncate max-w-32" title={result.error}>
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새로고침 */}
        {results.length > 0 && !isGenerating && (
          <Button
            variant="outline"
            onClick={() => {
              setResults([])
              fetchPassages()
            }}
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            초기화
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

