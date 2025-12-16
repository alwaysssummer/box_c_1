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
  Eye,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuestionPreviewModal } from '@/components/features/question/QuestionPreviewModal'
import { QuestionData } from '@/components/features/question/QuestionRenderer'
import { Checkbox } from '@/components/ui/checkbox'

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
  hasExistingQuestion?: boolean  // 이미 생성된 문제가 있는지
}

interface ValidationInfo {
  isValid: boolean
  status: 'success' | 'warning' | 'error'
  errors: Array<{ code: string; message: string; field?: string }>
  warnings: Array<{ code: string; message: string; field?: string }>
}

interface GenerationResult {
  passageId: string
  passageName: string
  status: 'pending' | 'generating' | 'success' | 'warning' | 'error'
  error?: string
  questionId?: string
  question?: QuestionData  // 생성된 문제 데이터
  validation?: ValidationInfo  // 검증 결과
  isIntegrated?: boolean  // 통합형 여부
  isMultiQuestion?: boolean  // 다중 문제 여부
  attempts?: number  // 시도 횟수
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

  // 미리보기 모달 상태
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewQuestion, setPreviewQuestion] = useState<QuestionData | null>(null)
  const [previewPassageName, setPreviewPassageName] = useState<string>('')

  // 선택적 생성을 위한 체크 상태
  const [checkedPassageIds, setCheckedPassageIds] = useState<Set<string>>(new Set())
  const [isCheckingExisting, setIsCheckingExisting] = useState(false)

  // 프롬프트 기반 문제 유형만 필터링
  const promptBasedTypes = questionTypes.filter(qt => qt.prompt_id)
  
  // 이미 생성된 지문 수
  const existingCount = passages.filter(p => p.hasExistingQuestion).length
  // 체크된 지문 수
  const checkedCount = checkedPassageIds.size

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
      setCheckedPassageIds(new Set())
      return
    }

    try {
      const passagePromises = selectedPassageIds.map(async (id) => {
        const response = await fetch(`/api/passages/${id}`)
        if (!response.ok) return null
        return response.json()
      })
      
      const results = await Promise.all(passagePromises)
      const validPassages = results.filter(Boolean) as PassageInfo[]
      setPassages(validPassages)
      
      // 초기에는 모든 지문 체크
      setCheckedPassageIds(new Set(validPassages.map(p => p.id)))
    } catch (error) {
      console.error('Error fetching passages:', error)
    }
  }, [selectedPassageIds])

  // 이미 생성된 문제 확인
  const checkExistingQuestions = useCallback(async () => {
    if (passages.length === 0 || !selectedTypeId) return
    
    setIsCheckingExisting(true)
    try {
      const response = await fetch('/api/generated-questions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageIds: passages.map(p => p.id),
          questionTypeId: selectedTypeId,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to check')
      
      const { existingPassageIds } = await response.json()
      const existingSet = new Set(existingPassageIds as string[])
      
      // passages에 hasExistingQuestion 플래그 설정
      setPassages(prev => prev.map(p => ({
        ...p,
        hasExistingQuestion: existingSet.has(p.id)
      })))
      
      // 이미 생성된 지문은 체크 해제
      setCheckedPassageIds(prev => {
        const newSet = new Set(prev)
        existingPassageIds.forEach((id: string) => newSet.delete(id))
        return newSet
      })
    } catch (error) {
      console.error('Error checking existing questions:', error)
    } finally {
      setIsCheckingExisting(false)
    }
  }, [passages.length, selectedTypeId])

  useEffect(() => {
    fetchQuestionTypes()
  }, [fetchQuestionTypes])

  useEffect(() => {
    fetchPassages()
  }, [fetchPassages])

  // 문제 유형 변경 또는 지문 로드 후 이미 생성된 문제 확인
  useEffect(() => {
    if (passages.length > 0 && selectedTypeId) {
      checkExistingQuestions()
    }
  }, [selectedTypeId, passages.length]) // checkExistingQuestions는 의존성에서 제외 (무한 루프 방지)

  // 체크박스 토글
  const togglePassageCheck = (passageId: string) => {
    setCheckedPassageIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(passageId)) {
        newSet.delete(passageId)
      } else {
        newSet.add(passageId)
      }
      return newSet
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = (includeExisting: boolean) => {
    if (includeExisting) {
      // 모든 지문 선택
      setCheckedPassageIds(new Set(passages.map(p => p.id)))
    } else {
      // 이미 생성된 것 제외하고 선택
      setCheckedPassageIds(new Set(
        passages.filter(p => !p.hasExistingQuestion).map(p => p.id)
      ))
    }
  }

  // 문제 생성
  const handleGenerate = async () => {
    if (!selectedTypeId || checkedPassageIds.size === 0) return

    const selectedType = questionTypes.find(qt => qt.id === selectedTypeId)
    if (!selectedType?.prompt_id) {
      alert('프롬프트 기반 문제 유형을 선택해주세요.')
      return
    }

    // 체크된 지문만 필터링
    const passagesToGenerate = passages.filter(p => checkedPassageIds.has(p.id))
    
    if (passagesToGenerate.length === 0) {
      alert('생성할 지문을 선택해주세요.')
      return
    }

    setIsGenerating(true)
    
    // 결과 초기화 (체크된 지문만)
    const initialResults: GenerationResult[] = passagesToGenerate.map(p => ({
      passageId: p.id,
      passageName: p.name,
      status: 'pending',
    }))
    setResults(initialResults)

    // 순차적으로 생성
    for (const passage of passagesToGenerate) {
      const currentPassageId = passage.id
      
      // 상태 업데이트: generating (passageId로 매칭)
      setResults(prev => prev.map(r => 
        r.passageId === currentPassageId ? { ...r, status: 'generating' } : r
      ))

      try {
        // upsert 방식: 기존 문제가 있으면 자동으로 덮어쓰기 됨
        const response = await fetch('/api/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passageId: currentPassageId,
            questionTypeId: selectedTypeId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Generation failed')
        }

        const data = await response.json()
        
        // 검증 결과에 따른 상태 결정
        const resultStatus = data.validation?.status === 'warning' ? 'warning' : 'success'
        
        // 다중 문제인 경우 subQuestions를 question에 포함
        const questionData = data.question ? {
          ...data.question,
          subQuestions: data.subQuestions || null,
        } : null
        
        // 상태 업데이트: success 또는 warning (passageId로 매칭)
        setResults(prev => prev.map(r => 
          r.passageId === currentPassageId ? { 
            ...r, 
            status: resultStatus, 
            questionId: data.question?.id,
            question: questionData,
            validation: data.validation,
            isIntegrated: data.isIntegrated,
            isMultiQuestion: data.isMultiQuestion,
            attempts: data.attempts,
          } : r
        ))
      } catch (error) {
        // 상태 업데이트: error (passageId로 매칭)
        setResults(prev => prev.map(r => 
          r.passageId === currentPassageId ? { 
            ...r, 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          } : r
        ))
      }
    }

    setIsGenerating(false)
    
    // 생성 후 상태 갱신
    checkExistingQuestions()
  }

  // 미리보기 핸들러
  const handlePreview = (result: GenerationResult) => {
    if (result.question) {
      setPreviewQuestion(result.question)
      setPreviewPassageName(result.passageName)
      setPreviewOpen(true)
    }
  }

  const successCount = results.filter(r => r.status === 'success').length
  const warningCount = results.filter(r => r.status === 'warning').length
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
            <div className="flex items-center gap-2">
              {existingCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  ⚠️ {existingCount}개 이미 생성됨
                </Badge>
              )}
              <Badge variant={selectedPassageIds.length > 0 ? 'default' : 'secondary'}>
                {checkedCount}/{selectedPassageIds.length}개 선택
              </Badge>
            </div>
          </div>
          
          {selectedPassageIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              좌측 트리에서 지문을 선택해주세요.
            </p>
          ) : (
            <>
              {/* 전체 선택 옵션 */}
              <div className="flex gap-2 mb-2 pb-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleSelectAll(false)}
                  disabled={isGenerating || isCheckingExisting}
                >
                  새 지문만 선택
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleSelectAll(true)}
                  disabled={isGenerating || isCheckingExisting}
                >
                  전체 선택 (재생성 포함)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCheckedPassageIds(new Set())}
                  disabled={isGenerating || isCheckingExisting}
                >
                  선택 해제
                </Button>
              </div>
              
              {/* 지문 목록 */}
              <div className="max-h-40 overflow-auto space-y-1">
                {isCheckingExisting ? (
                  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    기존 문제 확인 중...
                  </div>
                ) : (
                  passages.map(p => (
                    <div 
                      key={p.id} 
                      className={cn(
                        'flex items-center gap-2 p-1.5 rounded text-xs cursor-pointer hover:bg-slate-100 transition-colors',
                        p.hasExistingQuestion && 'bg-amber-50',
                        checkedPassageIds.has(p.id) && 'bg-blue-50'
                      )}
                      onClick={() => !isGenerating && togglePassageCheck(p.id)}
                    >
                      <Checkbox 
                        checked={checkedPassageIds.has(p.id)}
                        onCheckedChange={() => togglePassageCheck(p.id)}
                        disabled={isGenerating}
                        className="h-4 w-4"
                      />
                      <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      {p.textbook_name && (
                        <span className="text-slate-400 flex-shrink-0">[{p.textbook_name}]</span>
                      )}
                      <span className="flex-1 truncate">{p.name}</span>
                      {p.hasExistingQuestion && (
                        <span className="flex items-center gap-1 text-amber-600 flex-shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          <span>이미 생성됨</span>
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
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
          disabled={isGenerating || !selectedTypeId || checkedCount === 0 || isCheckingExisting}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              생성 중... ({successCount + errorCount}/{results.length})
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              선택된 {checkedCount}개 지문 문제 생성
            </>
          )}
        </Button>
        
        {/* 재생성 경고 */}
        {checkedPassageIds.size > 0 && passages.some(p => checkedPassageIds.has(p.id) && p.hasExistingQuestion) && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            이미 생성된 지문이 포함되어 있습니다. 재생성 시 기존 문제가 삭제됩니다.
          </p>
        )}

        {/* 생성 결과 */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">생성 결과</span>
              <div className="flex gap-2">
                {successCount > 0 && (
                  <Badge variant="default" className="bg-green-500">
                    ✓ 성공 {successCount}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50">
                    ⚠ 경고 {warningCount}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    ✕ 실패 {errorCount}
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
                    result.status === 'warning' && 'bg-amber-50',
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
                  {result.status === 'warning' && (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  {result.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="flex-1 truncate">{result.passageName}</span>
                  
                  {/* 통합형 표시 */}
                  {result.isIntegrated && (
                    <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-purple-600 border-purple-300">
                      통합형
                    </Badge>
                  )}
                  
                  {/* 재시도 표시 */}
                  {result.attempts && result.attempts > 1 && (
                    <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-slate-500">
                      {result.attempts}회
                    </Badge>
                  )}
                  
                  {/* 성공/경고 시 미리보기 */}
                  {(result.status === 'success' || result.status === 'warning') && result.question && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => handlePreview(result)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      미리보기
                    </Button>
                  )}
                  
                  {/* 경고 메시지 */}
                  {result.status === 'warning' && result.validation && (
                    <span 
                      className="text-xs text-amber-600 truncate max-w-40" 
                      title={result.validation.warnings.map(w => w.message).join(', ')}
                    >
                      {result.validation.warnings.length}개 경고
                    </span>
                  )}
                  
                  {/* 오류 메시지 */}
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

        {/* 미리보기 모달 */}
        <QuestionPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          question={previewQuestion}
          passageName={previewPassageName}
          questionTypeName={questionTypes.find(qt => qt.id === selectedTypeId)?.name}
        />
      </CardContent>
    </Card>
  )
}




