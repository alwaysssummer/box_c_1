'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Loader2, Save, Trash2, Edit, X, Play, 
  ChevronDown, ChevronUp, Sparkles, Clock, Coins, 
  Book, CheckCircle2, AlertCircle, History, Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  PROMPT_CATEGORIES, 
  PROMPT_STATUS, 
  AI_MODELS, 
  type ModelId,
  type PromptTestResult,
  type AIErrorResponse
} from '@/types'
import type { Prompt, Passage, Group, Textbook, Unit } from '@/types/database'

interface PromptFormData {
  id: string | null
  name: string
  description: string
  category: string
  target: 'passage' | 'sentence'
  content: string
  variables: string[]
  outputSchema: string
  sampleInput: string
  sampleOutput: string
  testPassageId: string | null
  preferredModel: ModelId
  status: 'draft' | 'testing' | 'confirmed'
}

interface PromptFormProps {
  prompt: Prompt | null
  isEditing: boolean
  onSave: (data: PromptFormData) => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
}

const initialFormData: PromptFormData = {
  id: null,
  name: '',
  description: '',
  category: 'general',
  target: 'passage',
  content: '',
  variables: [],
  outputSchema: '',
  sampleInput: '',
  sampleOutput: '',
  testPassageId: null,
  preferredModel: 'gpt-4o-mini',
  status: 'draft',
}

export function PromptForm({
  prompt,
  isEditing,
  onSave,
  onDelete,
  onEdit,
  onCancel,
}: PromptFormProps) {
  const [formData, setFormData] = useState<PromptFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 테스트 패널 상태
  const [showTestPanel, setShowTestPanel] = useState(true)
  const [testInputMode, setTestInputMode] = useState<'manual' | 'passage'>('manual')
  const [manualTestInput, setManualTestInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<ModelId>('gpt-4o-mini')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<PromptTestResult | null>(null)
  const [testHistory, setTestHistory] = useState<PromptTestResult[]>([])

  // 지문 선택 상태
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [textbooks, setTextbooks] = useState<Textbook[]>([])
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null)
  const [units, setUnits] = useState<Unit[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [passages, setPassages] = useState<Passage[]>([])
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null)
  const [isLoadingPassages, setIsLoadingPassages] = useState(false)

  // 초기 데이터 로드
  useEffect(() => {
    if (prompt) {
      setFormData({
        id: prompt.id,
        name: prompt.name,
        description: prompt.description || '',
        category: prompt.category,
        target: prompt.target,
        content: prompt.content,
        variables: prompt.variables || [],
        outputSchema: prompt.output_schema || '',
        sampleInput: prompt.sample_input || '',
        sampleOutput: prompt.sample_output || '',
        testPassageId: prompt.test_passage_id,
        preferredModel: prompt.preferred_model as ModelId,
        status: prompt.status,
      })
      setSelectedModel(prompt.preferred_model as ModelId)
      setManualTestInput(prompt.sample_input || '')
    } else {
      setFormData(initialFormData)
      setManualTestInput('')
      setTestResult(null)
    }
  }, [prompt])

  // 그룹 목록 가져오기
  useEffect(() => {
    const fetchGroups = async () => {
      const response = await fetch('/api/groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data)
      }
    }
    fetchGroups()
  }, [])

  // 선택된 그룹에 따라 교재 목록 가져오기
  useEffect(() => {
    if (selectedGroupId) {
      const fetchTextbooks = async () => {
        const response = await fetch(`/api/textbooks?groupId=${selectedGroupId}`)
        if (response.ok) {
          const data = await response.json()
          setTextbooks(data)
        }
      }
      fetchTextbooks()
    } else {
      setTextbooks([])
    }
    setSelectedTextbookId(null)
    setUnits([])
    setSelectedUnitId(null)
    setPassages([])
  }, [selectedGroupId])

  // 선택된 교재에 따라 단원 목록 가져오기
  useEffect(() => {
    if (selectedTextbookId) {
      const fetchUnits = async () => {
        const response = await fetch(`/api/units?textbookId=${selectedTextbookId}`)
        if (response.ok) {
          const data = await response.json()
          setUnits(data)
        }
      }
      fetchUnits()
    } else {
      setUnits([])
    }
    setSelectedUnitId(null)
    setPassages([])
  }, [selectedTextbookId])

  // 선택된 단원에 따라 지문 목록 가져오기
  useEffect(() => {
    if (selectedUnitId) {
      setIsLoadingPassages(true)
      const fetchPassages = async () => {
        try {
          const response = await fetch(`/api/passages?unitId=${selectedUnitId}`)
          if (response.ok) {
            const data = await response.json()
            setPassages(data)
          }
        } finally {
          setIsLoadingPassages(false)
        }
      }
      fetchPassages()
    } else {
      setPassages([])
    }
  }, [selectedUnitId])

  // 프롬프트에서 변수 추출
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\[\[([^\]]+)\]\]/g) || []
    return [...new Set(matches.map((m) => m.replace(/\[\[|\]\]/g, '')))]
  }

  const handleContentChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      content: value,
      variables: extractVariables(value),
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim() || isSaving) return

    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return

    if (confirm(`"${formData.name}" 프롬프트를 삭제하시겠습니까?`)) {
      setIsDeleting(true)
      try {
        await onDelete()
      } finally {
        setIsDeleting(false)
      }
    }
  }

  // 프롬프트 테스트 실행
  const handleTestPrompt = async () => {
    const testInput = testInputMode === 'manual' ? manualTestInput : selectedPassage?.content || ''

    if (!formData.content.trim() || !testInput.trim() || isTesting) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          userPrompt: formData.content,
          sampleInput: testInput,
          outputSchema: formData.outputSchema || undefined,
        }),
      })

      const result = await response.json()
      setTestResult(result)

      if (result.success) {
        toast.success('테스트 성공', {
          description: `${(result.responseTime / 1000).toFixed(2)}초, ${result.usage?.totalTokens || 0} 토큰`,
        })
        setTestHistory(prev => [result, ...prev.slice(0, 4)])
        
        // 테스트 기록 저장
        if (formData.id) {
          await fetch(`/api/prompts/${formData.id}/test-history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedModel,
              inputText: testInput,
              outputText: result.result,
              success: result.success,
              responseTime: result.responseTime,
              inputTokens: result.usage?.inputTokens,
              outputTokens: result.usage?.outputTokens,
            }),
          })
        }
      } else {
        // 상세 에러 정보가 있으면 표시
        const aiError = result.aiError as AIErrorResponse | undefined
        toast.error('테스트 실패', {
          description: aiError 
            ? `${aiError.message}\n💡 ${aiError.solution}`
            : result.error,
          duration: 8000,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '테스트 실패'
      toast.error('테스트 오류', {
        description: errorMessage,
      })
      setTestResult({
        success: false,
        error: errorMessage,
        responseTime: 0,
        model: AI_MODELS[selectedModel].name,
      })
    } finally {
      setIsTesting(false)
    }
  }

  // 테스트 결과를 샘플 출력으로 적용
  const applyTestResult = () => {
    if (testResult?.success && testResult.result) {
      setFormData(prev => ({ ...prev, sampleOutput: testResult.result || '' }))
    }
  }

  // 테스트 입력을 샘플 입력으로 적용
  const applySampleInput = () => {
    const testInput = testInputMode === 'manual' ? manualTestInput : selectedPassage?.content || ''
    setFormData(prev => ({ 
      ...prev, 
      sampleInput: testInput,
      testPassageId: testInputMode === 'passage' ? selectedPassage?.id || null : null,
    }))
  }

  // 상태 변경
  const handleStatusChange = (newStatus: 'draft' | 'testing' | 'confirmed') => {
    setFormData(prev => ({ ...prev, status: newStatus }))
  }

  const testInput = testInputMode === 'manual' ? manualTestInput : selectedPassage?.content || ''

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          {isEditing
            ? formData.id
              ? '프롬프트 수정'
              : '새 프롬프트'
            : '프롬프트 상세'}
        </h3>
        
        {/* 상태 배지 */}
        {formData.id && (
          <div className="flex items-center gap-2">
            {PROMPT_STATUS.map(st => (
              <button
                key={st.value}
                onClick={() => isEditing && handleStatusChange(st.value as any)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-all',
                  formData.status === st.value 
                    ? st.color + ' ring-2 ring-offset-1'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                  !isEditing && 'cursor-default'
                )}
                disabled={!isEditing}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 기본 정보 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">기본 정보</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                프롬프트명 *
              </label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={!isEditing}
                placeholder="예: 주제문 추출"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                카테고리
              </label>
              <Select
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMPT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">설명</label>
            <Input
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!isEditing}
              placeholder="프롬프트에 대한 간단한 설명"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">대상</label>
            <RadioGroup
              value={formData.target}
              onValueChange={value => setFormData(prev => ({ ...prev, target: value as 'passage' | 'sentence' }))}
              disabled={!isEditing}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="passage" id="target-passage" />
                <label htmlFor="target-passage" className="text-sm cursor-pointer">지문</label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sentence" id="target-sentence" />
                <label htmlFor="target-sentence" className="text-sm cursor-pointer">문장</label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* 프롬프트 내용 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">프롬프트 내용</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              프롬프트 *
              <span className="text-xs ml-2">(변수: [[passage]], [[sentence]], [[korean]])</span>
            </label>
            <Textarea
              value={formData.content}
              onChange={e => handleContentChange(e.target.value)}
              disabled={!isEditing}
              placeholder={`예: 다음 영어 지문을 분석하여 주제문을 찾아주세요.\n\n[[passage]]\n\n주제문의 문장 번호와 내용을 JSON 형식으로 응답해주세요.`}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {formData.variables.length > 0 && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1">추출된 변수</label>
              <div className="flex flex-wrap gap-2">
                {formData.variables.map((v, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-violet-100 text-violet-700">
                    [[{v}]]
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              출력 스키마 (JSON)
            </label>
            <Textarea
              value={formData.outputSchema}
              onChange={e => setFormData(prev => ({ ...prev, outputSchema: e.target.value }))}
              disabled={!isEditing}
              placeholder='예: { "topic_sentence": "string", "sentence_no": "number" }'
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* 프롬프트 테스트 */}
      <div className="border border-violet-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTestPanel(!showTestPanel)}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <span className="font-semibold text-violet-900">프롬프트 테스트</span>
            <span className="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
              AI 미리보기
            </span>
          </div>
          {showTestPanel ? (
            <ChevronUp className="w-5 h-5 text-violet-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-violet-600" />
          )}
        </button>

        {showTestPanel && (
          <div className="p-4 space-y-4 bg-white">
            {/* 입력 모드 선택 */}
            <div className="flex gap-2">
              <Button
                variant={testInputMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setTestInputMode('manual')}
                size="sm"
                className={testInputMode === 'manual' ? 'bg-violet-500 hover:bg-violet-600' : ''}
              >
                <Edit className="w-4 h-4 mr-2" /> 직접 입력
              </Button>
              <Button
                variant={testInputMode === 'passage' ? 'default' : 'outline'}
                onClick={() => setTestInputMode('passage')}
                size="sm"
                className={testInputMode === 'passage' ? 'bg-violet-500 hover:bg-violet-600' : ''}
              >
                <Book className="w-4 h-4 mr-2" /> 교재에서 선택
              </Button>
            </div>

            {/* 샘플 입력 */}
            {testInputMode === 'manual' ? (
              <div>
                <label className="block text-sm font-medium mb-1">📝 샘플 입력</label>
                <Textarea
                  value={manualTestInput}
                  onChange={e => setManualTestInput(e.target.value)}
                  placeholder="테스트할 지문이나 문장을 입력하세요..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">그룹</label>
                    <Select
                      value={selectedGroupId || ''}
                      onValueChange={setSelectedGroupId}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="그룹 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map(g => (
                          <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">교재</label>
                    <Select
                      value={selectedTextbookId || ''}
                      onValueChange={setSelectedTextbookId}
                      disabled={!selectedGroupId}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="교재 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {textbooks.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">단원</label>
                    <Select
                      value={selectedUnitId || ''}
                      onValueChange={setSelectedUnitId}
                      disabled={!selectedTextbookId}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="단원 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">지문</label>
                    <Select
                      value={selectedPassage?.id || ''}
                      onValueChange={value => {
                        const p = passages.find(p => p.id === value)
                        setSelectedPassage(p || null)
                      }}
                      disabled={!selectedUnitId || isLoadingPassages}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="지문 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {passages.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedPassage && (
                  <div className="border rounded-md p-3 bg-muted/50">
                    <p className="text-sm font-medium mb-1">선택된 지문:</p>
                    <ScrollArea className="h-24">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {selectedPassage.content}
                      </p>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {/* 입력 저장 버튼 */}
            {testInput && (
              <Button
                variant="outline"
                size="sm"
                onClick={applySampleInput}
                className="text-violet-600 border-violet-300 hover:bg-violet-50"
              >
                이 입력을 샘플로 저장
              </Button>
            )}

            {/* AI 모델 선택 */}
            <div>
              <label className="block text-sm font-medium mb-2">🤖 AI 모델 선택</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(Object.entries(AI_MODELS) as [ModelId, typeof AI_MODELS[ModelId]][]).map(([id, info]) => (
                  <label
                    key={id}
                    className={cn(
                      'flex flex-col p-2 border rounded-lg cursor-pointer transition-all',
                      selectedModel === id
                        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                        : 'border-border hover:border-violet-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="ai-model"
                        value={id}
                        checked={selectedModel === id}
                        onChange={() => setSelectedModel(id)}
                        className="w-3 h-3 accent-violet-600"
                      />
                      <span className="text-sm font-medium">{info.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-5">{info.description}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 테스트 실행 */}
            <Button
              onClick={handleTestPrompt}
              disabled={!formData.content.trim() || !testInput.trim() || isTesting}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  테스트 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  테스트 실행
                </>
              )}
            </Button>

            {/* 테스트 결과 */}
            {testResult && (
              <div className={cn(
                'border rounded-lg p-4',
                testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'font-semibold flex items-center gap-1',
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  )}>
                    {testResult.success ? (
                      <><CheckCircle2 className="w-4 h-4" /> 성공</>
                    ) : (
                      <><AlertCircle className="w-4 h-4" /> 실패</>
                    )}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(testResult.responseTime / 1000).toFixed(2)}초
                    </span>
                    {testResult.usage && (
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {testResult.usage.totalTokens} 토큰
                      </span>
                    )}
                    <Badge variant="outline">{testResult.model}</Badge>
                  </div>
                </div>

                {testResult.success ? (
                  <>
                    <pre className="bg-white border rounded p-3 text-sm font-mono overflow-auto max-h-60 whitespace-pre-wrap">
                      {testResult.result}
                    </pre>
                    <Button
                      onClick={applyTestResult}
                      variant="outline"
                      size="sm"
                      className="mt-2 text-green-700 border-green-300 hover:bg-green-100"
                    >
                      ✓ 이 결과를 샘플 출력으로 저장
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 font-medium">{testResult.error}</p>
                    {testResult.aiError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-700">{testResult.aiError.solution}</span>
                        </div>
                        <div className="flex gap-2">
                          {testResult.aiError.alternativeModel && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedModel(testResult.aiError?.alternativeModel as ModelId)}
                              className="text-xs"
                            >
                              🔄 {testResult.aiError.alternativeModel} 모델로 전환
                            </Button>
                          )}
                          {testResult.aiError.canRetry && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleTestPrompt}
                              className="text-xs"
                            >
                              🔁 재시도
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 테스트 히스토리 */}
            {testHistory.length > 0 && (
              <div className="border-t pt-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <History className="w-4 h-4" /> 최근 테스트 기록
                </h5>
                <div className="space-y-2 max-h-32 overflow-auto">
                  {testHistory.map((hist, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                      <span className="truncate max-w-[200px] font-mono">
                        {hist.result?.substring(0, 50)}...
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{hist.model}</Badge>
                        <span>{(hist.responseTime / 1000).toFixed(1)}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 샘플 데이터 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">샘플 데이터</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">샘플 입력</label>
            <Textarea
              value={formData.sampleInput}
              onChange={e => setFormData(prev => ({ ...prev, sampleInput: e.target.value }))}
              disabled={!isEditing}
              placeholder="테스트에 사용할 샘플 입력 데이터"
              rows={3}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">샘플 출력</label>
            <Textarea
              value={formData.sampleOutput}
              onChange={e => setFormData(prev => ({ ...prev, sampleOutput: e.target.value }))}
              disabled={!isEditing}
              placeholder="AI 출력 예시 (테스트 결과에서 적용 가능)"
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.content.trim() || isSaving}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              저장
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1">
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onEdit} className="flex-1">
              <Edit className="w-4 h-4 mr-2" />
              수정
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              className="flex-1"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              삭제
            </Button>
          </>
        )}
      </div>
    </div>
  )
}



