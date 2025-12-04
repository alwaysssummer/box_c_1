'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Trash2, Edit, X, Play, ChevronDown, ChevronUp, Sparkles, Clock, Coins, BookOpen, FileText, Library, Unlink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ANSWER_FORMATS, PROMPT_STATUS, AI_MODELS, DIFFICULTY_OPTIONS, DIFFICULTY_MODEL_MAP, ModelId, Difficulty } from '@/types'
import type { Prompt } from '@/types/database'
import type { DataTypeItem } from './DataTypeList'

interface TestResult {
  success: boolean
  result?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  responseTime: number
  model: string
}

// 지문 정보 타입
interface PassageInfo {
  id: string
  name: string
  content: string
  unit: { id: string; name: string } | null
  textbook: { id: string; name: string } | null
  group: { id: string; name: string } | null
}

interface DataTypeFormData {
  id: string | null
  name: string
  target: 'passage' | 'sentence'
  promptId: string | null
  prompt: string
  variables: string[]
  outputSchema: string
  sampleResult: string
  hasAnswer: boolean
  answerFormat: string
  hasDependency: boolean
  dependsOn: string[]
  difficulty: Difficulty
  recommendedModel: ModelId
}

interface DataTypeFormProps {
  dataType: DataTypeItem | null
  allDataTypes: DataTypeItem[]
  isEditing: boolean
  onSave: (data: DataTypeFormData) => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
}

const initialFormData: DataTypeFormData = {
  id: null,
  name: '',
  target: 'passage',
  promptId: null,
  prompt: '',
  variables: [],
  outputSchema: '',
  sampleResult: '',
  hasAnswer: false,
  answerFormat: '',
  hasDependency: false,
  dependsOn: [],
  difficulty: 'medium',
  recommendedModel: 'gpt-4o-mini',
}

export function DataTypeForm({
  dataType,
  allDataTypes,
  isEditing,
  onSave,
  onDelete,
  onEdit,
  onCancel,
}: DataTypeFormProps) {
  const [formData, setFormData] = useState<DataTypeFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 프롬프트 라이브러리 상태
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [promptInputMode, setPromptInputMode] = useState<'library' | 'direct'>('library')
  const [selectedPromptForForm, setSelectedPromptForForm] = useState<Prompt | null>(null)
  
  // 프롬프트 테스트 상태
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [testSampleInput, setTestSampleInput] = useState('')
  const [selectedModel, setSelectedModel] = useState<ModelId>('gpt-4o-mini')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testHistory, setTestHistory] = useState<TestResult[]>([])
  
  // 지문 선택 상태
  const [inputMode, setInputMode] = useState<'direct' | 'passage'>('direct')
  const [passages, setPassages] = useState<PassageInfo[]>([])
  const [isLoadingPassages, setIsLoadingPassages] = useState(false)
  const [selectedPassageId, setSelectedPassageId] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [selectedTextbook, setSelectedTextbook] = useState<string>('')
  const [selectedUnit, setSelectedUnit] = useState<string>('')

  // 프롬프트 라이브러리 로드
  useEffect(() => {
    const loadPrompts = async () => {
      setIsLoadingPrompts(true)
      try {
        const response = await fetch('/api/prompts')
        if (response.ok) {
          const data = await response.json()
          setPrompts(data)
        }
      } catch (error) {
        console.error('Failed to load prompts:', error)
      } finally {
        setIsLoadingPrompts(false)
      }
    }
    loadPrompts()
  }, [])

  useEffect(() => {
    if (dataType) {
      const promptId = (dataType as unknown as { prompt_id?: string }).prompt_id || null
      const difficulty = (dataType as unknown as { difficulty?: Difficulty }).difficulty || 'medium'
      const recommendedModel = (dataType as unknown as { recommended_model?: ModelId }).recommended_model || DIFFICULTY_MODEL_MAP[difficulty] || 'gpt-4o-mini'
      setFormData({
        id: dataType.id,
        name: dataType.name,
        target: dataType.target,
        promptId: promptId,
        prompt: (dataType as unknown as { prompt?: string }).prompt || '',
        variables: [],
        outputSchema: '',
        sampleResult: '',
        hasAnswer: dataType.has_answer,
        answerFormat: (dataType as unknown as { answer_format?: string }).answer_format || '',
        hasDependency: dataType.has_dependency,
        dependsOn: dataType.dependsOn || [],
        difficulty,
        recommendedModel: recommendedModel as ModelId,
      })
      // 연결된 프롬프트가 있으면 라이브러리 모드, 없으면 직접 입력 모드
      if (promptId) {
        setPromptInputMode('library')
        const linkedPrompt = prompts.find(p => p.id === promptId)
        setSelectedPromptForForm(linkedPrompt || null)
      } else if ((dataType as unknown as { prompt?: string }).prompt) {
        setPromptInputMode('direct')
        setSelectedPromptForForm(null)
      } else {
        setPromptInputMode('library')
        setSelectedPromptForForm(null)
      }
    } else {
      setFormData(initialFormData)
      setPromptInputMode('library')
      setSelectedPromptForForm(null)
    }
  }, [dataType, prompts])

  // 지문 목록 로드
  useEffect(() => {
    const loadPassages = async () => {
      setIsLoadingPassages(true)
      try {
        const response = await fetch('/api/passages')
        if (response.ok) {
          const data = await response.json()
          setPassages(data)
        }
      } catch (error) {
        console.error('Failed to load passages:', error)
      } finally {
        setIsLoadingPassages(false)
      }
    }
    
    if (showTestPanel && inputMode === 'passage' && passages.length === 0) {
      loadPassages()
    }
  }, [showTestPanel, inputMode, passages.length])

  // 프롬프트에서 변수 추출
  const extractVariables = (prompt: string): string[] => {
    const matches = prompt.match(/\[\[([^\]]+)\]\]/g) || []
    return matches.map((m) => m.replace(/\[\[|\]\]/g, ''))
  }

  const handlePromptChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      prompt: value,
      variables: extractVariables(value),
    }))
  }

  const handleSave = async () => {
    if (!formData.name.trim() || isSaving) return

    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    
    if (confirm(`"${formData.name}" 유형을 삭제하시겠습니까?`)) {
      setIsDeleting(true)
      try {
        await onDelete()
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleDependencyToggle = (depId: string) => {
    setFormData((prev) => {
      const current = prev.dependsOn || []
      const newDeps = current.includes(depId)
        ? current.filter((id) => id !== depId)
        : [...current, depId]
      return { ...prev, dependsOn: newDeps }
    })
  }

  // 프롬프트 테스트 실행
  const handleTestPrompt = async () => {
    if (!formData.prompt.trim() || !testSampleInput.trim() || isTesting) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/test-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          userPrompt: formData.prompt,
          sampleInput: testSampleInput,
          outputSchema: formData.outputSchema || undefined,
        }),
      })

      const result: TestResult = await response.json()
      setTestResult(result)
      
      if (result.success) {
        setTestHistory((prev) => [result, ...prev.slice(0, 4)]) // 최근 5개만 유지
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : '테스트 실패',
        responseTime: 0,
        model: AI_MODELS[selectedModel].name,
      })
    } finally {
      setIsTesting(false)
    }
  }

  // 테스트 결과를 샘플 결과로 적용
  const applyTestResult = () => {
    if (testResult?.success && testResult.result) {
      setFormData((prev) => ({ ...prev, sampleResult: testResult.result || '' }))
    }
  }

  // 지문 선택 시 샘플 입력에 반영
  const handlePassageSelect = (passageId: string) => {
    setSelectedPassageId(passageId)
    const passage = passages.find((p) => p.id === passageId)
    if (passage?.content) {
      setTestSampleInput(passage.content)
    }
  }

  // 필터링된 지문 목록
  const groups = [...new Map(passages.filter(p => p.group).map(p => [p.group!.id, p.group!])).values()]
  const textbooks = [...new Map(
    passages
      .filter(p => p.textbook && (!selectedGroup || p.group?.id === selectedGroup))
      .map(p => [p.textbook!.id, p.textbook!])
  ).values()]
  const units = [...new Map(
    passages
      .filter(p => p.unit && (!selectedTextbook || p.textbook?.id === selectedTextbook))
      .map(p => [p.unit!.id, p.unit!])
  ).values()]
  const filteredPassages = passages.filter(p => 
    (!selectedGroup || p.group?.id === selectedGroup) &&
    (!selectedTextbook || p.textbook?.id === selectedTextbook) &&
    (!selectedUnit || p.unit?.id === selectedUnit)
  )

  const availableDataTypes = allDataTypes.filter((dt) => dt.id !== formData.id)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        {isEditing
          ? formData.id
            ? '데이터 유형 수정'
            : '새 데이터 유형'
          : '데이터 유형 상세'}
      </h3>

      {/* 기본 정보 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          기본 정보
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              유형명 *
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              disabled={!isEditing}
              placeholder="예: 주제문 찾기"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              대상
            </label>
            <RadioGroup
              value={formData.target}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  target: value as 'passage' | 'sentence',
                }))
              }
              disabled={!isEditing}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="passage" id="passage" />
                <label htmlFor="passage" className="text-sm cursor-pointer">
                  지문
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sentence" id="sentence" />
                <label htmlFor="sentence" className="text-sm cursor-pointer">
                  문장
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* 프롬프트 설정 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          프롬프트 설정
        </h4>
        <div className="space-y-4">
          {/* 프롬프트 입력 모드 선택 */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              프롬프트 입력 방식
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isEditing) return
                  setPromptInputMode('library')
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  promptInputMode === 'library'
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-border hover:border-violet-300',
                  !isEditing && 'opacity-60 cursor-not-allowed'
                )}
                disabled={!isEditing}
              >
                <Library className="w-4 h-4" />
                라이브러리에서 선택
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isEditing) return
                  setPromptInputMode('direct')
                  setFormData(prev => ({ ...prev, promptId: null }))
                  setSelectedPromptForForm(null)
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                  promptInputMode === 'direct'
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-border hover:border-violet-300',
                  !isEditing && 'opacity-60 cursor-not-allowed'
                )}
                disabled={!isEditing}
              >
                <Edit className="w-4 h-4" />
                직접 입력
              </button>
            </div>
          </div>

          {/* 라이브러리에서 선택 */}
          {promptInputMode === 'library' && (
            <div className="space-y-3 border border-violet-200 rounded-lg p-3 bg-violet-50/50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-violet-900">
                  📚 프롬프트 라이브러리
                </label>
                {selectedPromptForForm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!isEditing) return
                      setSelectedPromptForForm(null)
                      setFormData(prev => ({ ...prev, promptId: null, prompt: '' }))
                    }}
                    className="h-7 text-xs text-muted-foreground hover:text-red-600"
                    disabled={!isEditing}
                  >
                    <Unlink className="w-3 h-3 mr-1" />
                    연결 해제
                  </Button>
                )}
              </div>

              {isLoadingPrompts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
                  <span className="ml-2 text-sm text-muted-foreground">프롬프트 로딩 중...</span>
                </div>
              ) : prompts.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  등록된 프롬프트가 없습니다.<br />
                  설정 {">"} 프롬프트에서 먼저 등록해주세요.
                </div>
              ) : (
                <>
                  <Select
                    value={formData.promptId || ''}
                    onValueChange={(value) => {
                      if (!isEditing) return
                      const prompt = prompts.find(p => p.id === value)
                      if (prompt) {
                        setSelectedPromptForForm(prompt)
                        setFormData(prev => ({
                          ...prev,
                          promptId: prompt.id,
                          prompt: prompt.content,
                          target: prompt.target,
                          outputSchema: prompt.output_schema || '',
                          sampleResult: prompt.sample_output || '',
                          variables: prompt.variables || [],
                        }))
                      }
                    }}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="프롬프트 선택..." />
                    </SelectTrigger>
                    <SelectContent>
                      {prompts.filter(p => p.status === 'confirmed').length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-green-600 font-semibold">✅ 확정됨</div>
                          {prompts.filter(p => p.status === 'confirmed').map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex items-center gap-2">
                                <span>{p.name}</span>
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">확정</Badge>
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {prompts.filter(p => p.status === 'testing').length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-yellow-600 font-semibold mt-1">🔄 테스트 중</div>
                          {prompts.filter(p => p.status === 'testing').map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex items-center gap-2">
                                <span>{p.name}</span>
                                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">테스트</Badge>
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {prompts.filter(p => p.status === 'draft').length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-gray-500 font-semibold mt-1">📝 초안</div>
                          {prompts.filter(p => p.status === 'draft').map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <span className="flex items-center gap-2">
                                <span>{p.name}</span>
                                <Badge variant="outline" className="text-xs">초안</Badge>
                              </span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>

                  {/* 선택된 프롬프트 미리보기 */}
                  {selectedPromptForForm && (
                    <div className="bg-white border border-violet-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">
                          {selectedPromptForForm.name}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            'text-xs',
                            selectedPromptForForm.status === 'confirmed' && 'bg-green-100 text-green-700',
                            selectedPromptForForm.status === 'testing' && 'bg-yellow-100 text-yellow-700',
                            selectedPromptForForm.status === 'draft' && 'bg-gray-100 text-gray-700'
                          )}
                        >
                          {PROMPT_STATUS.find(s => s.value === selectedPromptForForm.status)?.label}
                        </Badge>
                      </div>
                      {selectedPromptForForm.description && (
                        <p className="text-xs text-muted-foreground">
                          {selectedPromptForForm.description}
                        </p>
                      )}
                      <div className="bg-muted/50 rounded p-2 max-h-32 overflow-auto">
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                          {selectedPromptForForm.content.substring(0, 300)}
                          {selectedPromptForForm.content.length > 300 && '...'}
                        </pre>
                      </div>
                      {selectedPromptForForm.variables && selectedPromptForForm.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedPromptForForm.variables.map((v, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              [[{v}]]
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 직접 입력 */}
          {promptInputMode === 'direct' && (
            <>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  프롬프트{' '}
                  <span className="text-xs text-muted-foreground">
                    (변수: [[passage]], [[sentence]], [[korean]])
                  </span>
                </label>
                <Textarea
                  value={formData.prompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  disabled={!isEditing}
                  placeholder={`예: 다음 지문에서 주제문을 찾아주세요.\n\n[[passage]]`}
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>

              {formData.variables.length > 0 && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    추출된 변수
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((v, idx) => (
                      <Badge key={idx} variant="secondary">
                        [[{v}]]
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              출력 스키마 (JSON)
            </label>
            <Textarea
              value={formData.outputSchema}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, outputSchema: e.target.value }))
              }
              disabled={!isEditing || promptInputMode === 'library'}
              placeholder='예: { "topic_sentence": "문장", "sentence_no": 1 }'
              rows={3}
              className="font-mono text-sm"
            />
            {promptInputMode === 'library' && selectedPromptForForm && (
              <p className="text-xs text-muted-foreground mt-1">
                * 연결된 프롬프트의 스키마를 사용합니다
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              결과 샘플
            </label>
            <Textarea
              value={formData.sampleResult}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sampleResult: e.target.value }))
              }
              disabled={!isEditing || promptInputMode === 'library'}
              placeholder="AI 출력 예시를 입력하세요"
              rows={3}
            />
            {promptInputMode === 'library' && selectedPromptForForm && (
              <p className="text-xs text-muted-foreground mt-1">
                * 연결된 프롬프트의 샘플 결과를 사용합니다
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 프롬프트 테스트 */}
      <div className="border border-border rounded-lg overflow-hidden">
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
            {/* 샘플 입력 모드 선택 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                📝 샘플 입력
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setInputMode('direct')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                    inputMode === 'direct'
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-border hover:border-violet-300'
                  )}
                >
                  <Edit className="w-4 h-4" />
                  직접 입력
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('passage')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                    inputMode === 'passage'
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-border hover:border-violet-300'
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  교재에서 선택
                </button>
              </div>

              {/* 직접 입력 모드 */}
              {inputMode === 'direct' && (
                <Textarea
                  value={testSampleInput}
                  onChange={(e) => setTestSampleInput(e.target.value)}
                  placeholder="테스트할 지문이나 문장을 입력하세요..."
                  rows={4}
                  className="font-mono text-sm"
                />
              )}

              {/* 교재에서 선택 모드 */}
              {inputMode === 'passage' && (
                <div className="space-y-3 border border-border rounded-lg p-3 bg-muted/30">
                  {isLoadingPassages ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">지문 로딩 중...</span>
                    </div>
                  ) : passages.length === 0 ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      등록된 지문이 없습니다.<br />
                      먼저 교재를 등록해주세요.
                    </div>
                  ) : (
                    <>
                      {/* 필터 드롭다운 */}
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={selectedGroup}
                          onChange={(e) => {
                            setSelectedGroup(e.target.value)
                            setSelectedTextbook('')
                            setSelectedUnit('')
                            setSelectedPassageId('')
                          }}
                          className="text-sm border border-border rounded-md p-2 bg-white"
                        >
                          <option value="">📁 전체 그룹</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        
                        <select
                          value={selectedTextbook}
                          onChange={(e) => {
                            setSelectedTextbook(e.target.value)
                            setSelectedUnit('')
                            setSelectedPassageId('')
                          }}
                          className="text-sm border border-border rounded-md p-2 bg-white"
                        >
                          <option value="">📚 전체 교재</option>
                          {textbooks.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      <select
                        value={selectedUnit}
                        onChange={(e) => {
                          setSelectedUnit(e.target.value)
                          setSelectedPassageId('')
                        }}
                        className="w-full text-sm border border-border rounded-md p-2 bg-white"
                      >
                        <option value="">📖 전체 단원</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>

                      {/* 지문 선택 */}
                      <select
                        value={selectedPassageId}
                        onChange={(e) => handlePassageSelect(e.target.value)}
                        className="w-full text-sm border border-violet-300 rounded-md p-2 bg-white font-medium"
                      >
                        <option value="">📄 지문 선택...</option>
                        {filteredPassages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - {p.content?.substring(0, 50)}...
                          </option>
                        ))}
                      </select>

                      {/* 선택된 지문 미리보기 */}
                      {selectedPassageId && (
                        <div className="bg-white border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                              {passages.find(p => p.id === selectedPassageId)?.group?.name}
                            </span>
                            <span>›</span>
                            <span>{passages.find(p => p.id === selectedPassageId)?.textbook?.name}</span>
                            <span>›</span>
                            <span>{passages.find(p => p.id === selectedPassageId)?.unit?.name}</span>
                          </div>
                          <p className="text-sm text-foreground line-clamp-4">
                            {testSampleInput}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* AI 모델 선택 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                🤖 AI 모델 선택
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(Object.entries(AI_MODELS) as [ModelId, typeof AI_MODELS[ModelId]][]).map(([id, info]) => (
                  <label
                    key={id}
                    className={cn(
                      'flex flex-col p-2 border rounded-lg cursor-pointer transition-all',
                      selectedModel === id
                        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                        : 'border-border hover:border-violet-300 hover:bg-violet-50/50'
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
                    <span className="text-xs text-muted-foreground ml-5">
                      {info.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* 테스트 실행 버튼 */}
            <Button
              onClick={handleTestPrompt}
              disabled={!formData.prompt.trim() || !testSampleInput.trim() || isTesting}
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
                testResult.success 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    'font-semibold',
                    testResult.success ? 'text-green-700' : 'text-red-700'
                  )}>
                    {testResult.success ? '✅ 성공' : '❌ 실패'}
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
                    <Badge variant="outline" className="text-xs">
                      {testResult.model}
                    </Badge>
                  </div>
                </div>

                {testResult.success ? (
                  <>
                    <pre className="bg-white border border-green-200 rounded p-3 text-sm font-mono overflow-auto max-h-60 whitespace-pre-wrap">
                      {testResult.result}
                    </pre>
                    <Button
                      onClick={applyTestResult}
                      variant="outline"
                      size="sm"
                      className="mt-2 text-green-700 border-green-300 hover:bg-green-100"
                    >
                      ✓ 이 결과를 샘플로 적용
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-red-600">{testResult.error}</p>
                )}
              </div>
            )}

            {/* 테스트 히스토리 */}
            {testHistory.length > 0 && (
              <div className="border-t border-border pt-4">
                <h5 className="text-sm font-medium text-muted-foreground mb-2">
                  📜 최근 테스트 기록
                </h5>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {testHistory.map((hist, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs"
                    >
                      <span className="font-mono truncate max-w-[200px]">
                        {hist.result?.substring(0, 50)}...
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{hist.model}</Badge>
                        <span className="text-muted-foreground">
                          {(hist.responseTime / 1000).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI 모델 설정 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          🤖 AI 모델 설정
        </h4>
        <div className="space-y-4">
          {/* 난이도 선택 */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              작업 난이도
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex flex-col p-3 border rounded-lg cursor-pointer transition-all',
                    formData.difficulty === option.value
                      ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                      : 'border-border hover:border-violet-300 hover:bg-violet-50/50',
                    !isEditing && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="difficulty"
                      value={option.value}
                      checked={formData.difficulty === option.value}
                      onChange={() => {
                        if (!isEditing) return
                        setFormData(prev => ({
                          ...prev,
                          difficulty: option.value,
                          recommendedModel: option.recommendedModel as ModelId,
                        }))
                      }}
                      disabled={!isEditing}
                      className="w-3 h-3 accent-violet-600"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-5 mt-1">
                    {option.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 추천 모델 */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              추천 AI 모델
              <span className="text-xs ml-2 text-violet-600">
                (난이도에 따라 자동 선택됨)
              </span>
            </label>
            <Select
              value={formData.recommendedModel}
              onValueChange={(value) => {
                if (!isEditing) return
                setFormData(prev => ({ ...prev, recommendedModel: value as ModelId }))
              }}
              disabled={!isEditing}
            >
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AI_MODELS).map(([id, info]) => (
                  <SelectItem key={id} value={id}>
                    <div className="flex items-center gap-2">
                      <span>{info.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({info.description})
                      </span>
                      {info.tier === 'mini' && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">저렴</Badge>
                      )}
                      {info.tier === 'premium' && (
                        <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700">고성능</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              💡 비용 효율: {formData.difficulty === 'simple' ? '매우 저렴 ($0.0001/호출)' : 
                formData.difficulty === 'medium' ? '저렴 ($0.0008/호출)' : '표준 ($0.025/호출)'}
            </p>
          </div>
        </div>
      </div>

      {/* 결과 유형 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          결과 유형
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">
              정답 유무
            </label>
            <RadioGroup
              value={formData.hasAnswer ? 'yes' : 'no'}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  hasAnswer: value === 'yes',
                  answerFormat: value === 'no' ? '' : prev.answerFormat,
                }))
              }
              disabled={!isEditing}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="no-answer" />
                <label htmlFor="no-answer" className="text-sm cursor-pointer">
                  없음 (자료형)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="has-answer" />
                <label htmlFor="has-answer" className="text-sm cursor-pointer">
                  있음 (문제형)
                </label>
              </div>
            </RadioGroup>
          </div>

          {formData.hasAnswer && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                정답 형식
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ANSWER_FORMATS.map((format) => (
                  <label
                    key={format.value}
                    className={cn(
                      'flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors',
                      formData.answerFormat === format.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted',
                      !isEditing && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <input
                      type="radio"
                      name="answerFormat"
                      value={format.value}
                      checked={formData.answerFormat === format.value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          answerFormat: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{format.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 의존성 설정 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          입력 의존성
        </h4>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="hasDependency"
              checked={formData.hasDependency}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  hasDependency: checked as boolean,
                  dependsOn: checked ? prev.dependsOn : [],
                }))
              }
              disabled={!isEditing}
            />
            <label
              htmlFor="hasDependency"
              className="text-sm cursor-pointer"
            >
              다른 데이터 유형의 출력이 필요함
            </label>
          </div>

          {formData.hasDependency && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                필요한 데이터 유형 선택
              </label>
              <div className="space-y-1 max-h-32 overflow-auto border border-border rounded p-2 bg-muted/30">
                {availableDataTypes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    선택 가능한 데이터 유형이 없습니다
                  </p>
                ) : (
                  availableDataTypes.map((dt) => (
                    <label
                      key={dt.id}
                      className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white rounded"
                    >
                      <Checkbox
                        checked={formData.dependsOn.includes(dt.id)}
                        onCheckedChange={() => handleDependencyToggle(dt.id)}
                        disabled={!isEditing}
                      />
                      <span className="text-sm">{dt.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || isSaving}
              className="flex-1"
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

