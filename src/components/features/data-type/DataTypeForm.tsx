'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Trash2, Edit, X, Library, Unlink, AlertTriangle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ANSWER_FORMATS, PROMPT_STATUS, AI_MODELS, DIFFICULTY_OPTIONS, DIFFICULTY_MODEL_MAP, ModelId, Difficulty } from '@/types'
import type { Prompt } from '@/types/database'
import type { DataTypeItem } from './DataTypeList'

// 슬롯 역할 타입 - 레이아웃 템플릿 슬롯과 일치
type SlotRole = 
  | 'instruction'   // 지시문
  | 'body'          // 본문
  | 'choices'       // 선택지
  | 'given'         // 주어진 글 (박스)
  | 'original'      // 원문 (문장분석/서술형)
  | 'translation'   // 해석
  | 'vocabulary'    // 어휘
  | 'grammar'       // 문법포인트
  | 'hints'         // 힌트
  | 'sentence'      // 문장(괄호)
  | 'words'         // 단어목록
  | 'answer'        // 정답
  | 'explanation'   // 해설

// 그룹 타입
type QuestionGroup = 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'

// 역할별 그룹 매핑
const SLOT_ROLES: { 
  value: SlotRole
  label: string
  description: string
  icon: string
  applicableGroups: QuestionGroup[]
}[] = [
  // 공통 역할
  { value: 'instruction', label: '지시문', description: '문제 안내문', icon: '📋', applicableGroups: ['practical', 'selection', 'writing'] },
  { value: 'body', label: '본문', description: '지문/본문', icon: '📄', applicableGroups: ['practical', 'selection'] },
  { value: 'answer', label: '정답', description: '정답 데이터', icon: '✅', applicableGroups: ['practical', 'selection', 'writing'] },
  { value: 'explanation', label: '해설', description: '문제 해설', icon: '💡', applicableGroups: ['practical', 'selection', 'writing'] },
  
  // 실전 그룹 전용
  { value: 'choices', label: '선택지', description: '5지선다 선택지', icon: '🔢', applicableGroups: ['practical'] },
  { value: 'given', label: '주어진 글', description: '박스형 주어진 글', icon: '📦', applicableGroups: ['practical'] },
  
  // 문장분석/서술형 그룹
  { value: 'original', label: '원문', description: '영어 원문', icon: '🔤', applicableGroups: ['analysis', 'writing'] },
  { value: 'translation', label: '해석', description: '한글 해석', icon: '🇰🇷', applicableGroups: ['analysis'] },
  { value: 'grammar', label: '문법포인트', description: '문법 분석', icon: '📐', applicableGroups: ['analysis'] },
  { value: 'vocabulary', label: '어휘', description: '단어/어휘 분석', icon: '📚', applicableGroups: ['analysis'] },
  
  // 서술형 그룹 전용
  { value: 'hints', label: '힌트', description: '작성 힌트', icon: '💭', applicableGroups: ['writing'] },
  { value: 'sentence', label: '문장(괄호)', description: '빈칸 문장', icon: '✏️', applicableGroups: ['writing'] },
  
  // 단어장 그룹 전용
  { value: 'words', label: '단어목록', description: '단어장 데이터', icon: '📖', applicableGroups: ['vocabulary'] },
]

// 그룹별 정보
const GROUP_INFO: { value: QuestionGroup; label: string; color: string }[] = [
  { value: 'practical', label: '실전', color: 'blue' },
  { value: 'selection', label: '선택/수정', color: 'purple' },
  { value: 'writing', label: '서술형/영작', color: 'orange' },
  { value: 'analysis', label: '문장분석', color: 'green' },
  { value: 'vocabulary', label: '단어장', color: 'pink' },
]

// 기존 호환성을 위한 타입 별칭
type QuestionRole = SlotRole

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
  availableRoles: QuestionRole[]
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
  availableRoles: [],
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
  const [selectedPromptForForm, setSelectedPromptForForm] = useState<Prompt | null>(null)

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
      const availableRoles = (dataType as unknown as { available_roles?: QuestionRole[] }).available_roles || []
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
        availableRoles,
      })
      
      // 연결된 프롬프트 찾기
      if (promptId) {
        const linkedPrompt = prompts.find(p => p.id === promptId)
        setSelectedPromptForForm(linkedPrompt || null)
      } else {
        setSelectedPromptForForm(null)
      }
    } else {
      setFormData(initialFormData)
      setSelectedPromptForForm(null)
    }
  }, [dataType, prompts])

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

      {/* 프롬프트 연결 */}
      <div className="border border-border rounded-lg p-4">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          프롬프트 연결
        </h4>
        <div className="space-y-4">
          <div className="space-y-3 border border-violet-200 rounded-lg p-3 bg-violet-50/50">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-violet-900 flex items-center gap-2">
                <Library className="w-4 h-4" />
                프롬프트 라이브러리
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
                    {prompts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span>{p.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {p.category}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 선택된 프롬프트 미리보기 */}
                {selectedPromptForForm && (
                  <div className="bg-white border border-violet-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">
                        {selectedPromptForForm.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {selectedPromptForForm.category}
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
                    
                    {/* 출력 스키마 미리보기 */}
                    {selectedPromptForForm.output_schema && (
                      <div>
                        <label className="text-xs text-muted-foreground">출력 스키마:</label>
                        <pre className="text-xs font-mono bg-slate-100 p-2 rounded mt-1 overflow-auto max-h-20">
                          {selectedPromptForForm.output_schema}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* 프롬프트 관리 바로가기 */}
          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                // 프롬프트 관리로 이동하는 로직 (필요 시 구현)
                // 현재는 안내 메시지만
              }}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              프롬프트 관리에서 새 프롬프트 생성/테스트
            </Button>
          </div>
        </div>
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

      {/* 레이아웃 슬롯 역할 (문제 유형 연계) */}
      <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50/30">
        <h4 className="text-sm font-semibold text-emerald-800 mb-3">
          🎯 레이아웃 슬롯 역할
        </h4>
        <p className="text-xs text-emerald-600 mb-3">
          이 데이터가 문제 레이아웃의 어떤 슬롯에서 사용될 수 있는지 선택하세요.
          문제 유형 정의 시 슬롯 매핑에 활용됩니다.
        </p>
        
        {/* 선택된 역할 요약 */}
        {formData.availableRoles.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 p-2 bg-white rounded-lg border border-emerald-100">
            <span className="text-xs text-muted-foreground mr-1">선택됨:</span>
            {formData.availableRoles.map(roleValue => {
              const role = SLOT_ROLES.find(r => r.value === roleValue)
              return role ? (
                <Badge key={roleValue} variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                  {role.icon} {role.label}
                </Badge>
              ) : null
            })}
          </div>
        )}
        
        <div className="space-y-4">
          {/* 공통 역할 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              공통 (여러 그룹에서 사용)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_ROLES.filter(r => r.applicableGroups.length >= 3).map((role) => (
                <label
                  key={role.value}
                  className={cn(
                    'flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-all text-sm',
                    formData.availableRoles.includes(role.value)
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50 bg-white',
                    !isEditing && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <Checkbox
                    checked={formData.availableRoles.includes(role.value)}
                    onCheckedChange={(checked) => {
                      if (!isEditing) return
                      setFormData((prev) => ({
                        ...prev,
                        availableRoles: checked
                          ? [...prev.availableRoles, role.value]
                          : prev.availableRoles.filter((r) => r !== role.value),
                      }))
                    }}
                    disabled={!isEditing}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{role.icon} {role.label}</span>
                    <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* 실전 그룹 역할 */}
          <div>
            <label className="text-xs font-medium text-blue-600 mb-2 block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              📝 실전 그룹 전용
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_ROLES.filter(r => r.applicableGroups.includes('practical') && r.applicableGroups.length < 3).map((role) => (
                <label
                  key={role.value}
                  className={cn(
                    'flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-all text-sm',
                    formData.availableRoles.includes(role.value)
                      ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                      : 'border-border hover:border-blue-300 hover:bg-blue-50/50 bg-white',
                    !isEditing && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <Checkbox
                    checked={formData.availableRoles.includes(role.value)}
                    onCheckedChange={(checked) => {
                      if (!isEditing) return
                      setFormData((prev) => ({
                        ...prev,
                        availableRoles: checked
                          ? [...prev.availableRoles, role.value]
                          : prev.availableRoles.filter((r) => r !== role.value),
                      }))
                    }}
                    disabled={!isEditing}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{role.icon} {role.label}</span>
                    <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* 문장분석/서술형 그룹 역할 */}
          <div>
            <label className="text-xs font-medium text-green-600 mb-2 block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              📖 문장분석 / ✍️ 서술형 그룹
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_ROLES.filter(r => 
                (r.applicableGroups.includes('analysis') || r.applicableGroups.includes('writing')) && 
                r.applicableGroups.length < 3
              ).map((role) => (
                <label
                  key={role.value}
                  className={cn(
                    'flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-all text-sm',
                    formData.availableRoles.includes(role.value)
                      ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                      : 'border-border hover:border-green-300 hover:bg-green-50/50 bg-white',
                    !isEditing && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <Checkbox
                    checked={formData.availableRoles.includes(role.value)}
                    onCheckedChange={(checked) => {
                      if (!isEditing) return
                      setFormData((prev) => ({
                        ...prev,
                        availableRoles: checked
                          ? [...prev.availableRoles, role.value]
                          : prev.availableRoles.filter((r) => r !== role.value),
                      }))
                    }}
                    disabled={!isEditing}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{role.icon} {role.label}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                      {role.applicableGroups.map(g => (
                        <Badge key={g} variant="outline" className="text-[10px] px-1 py-0">
                          {GROUP_INFO.find(gi => gi.value === g)?.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* 단어장 그룹 역할 */}
          <div>
            <label className="text-xs font-medium text-pink-600 mb-2 block flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              📖 단어장 그룹 전용
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SLOT_ROLES.filter(r => r.applicableGroups.includes('vocabulary') && r.applicableGroups.length < 3).map((role) => (
                <label
                  key={role.value}
                  className={cn(
                    'flex items-start gap-2 p-2 border rounded-lg cursor-pointer transition-all text-sm',
                    formData.availableRoles.includes(role.value)
                      ? 'border-pink-500 bg-pink-50 ring-1 ring-pink-500'
                      : 'border-border hover:border-pink-300 hover:bg-pink-50/50 bg-white',
                    !isEditing && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <Checkbox
                    checked={formData.availableRoles.includes(role.value)}
                    onCheckedChange={(checked) => {
                      if (!isEditing) return
                      setFormData((prev) => ({
                        ...prev,
                        availableRoles: checked
                          ? [...prev.availableRoles, role.value]
                          : prev.availableRoles.filter((r) => r !== role.value),
                      }))
                    }}
                    disabled={!isEditing}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{role.icon} {role.label}</span>
                    <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {formData.availableRoles.length === 0 && isEditing && (
          <p className="text-xs text-amber-600 mt-3">
            ⚠️ 최소 하나 이상의 역할을 선택하면 문제 유형 정의 시 슬롯 매핑이 더 쉬워집니다.
          </p>
        )}
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
              disabled={!formData.name.trim() || !formData.promptId || isSaving}
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
      
      {/* 저장 조건 안내 */}
      {isEditing && !formData.promptId && (
        <p className="text-xs text-center text-amber-600">
          ⚠️ 프롬프트를 선택해야 저장할 수 있습니다
        </p>
      )}
    </div>
  )
}
