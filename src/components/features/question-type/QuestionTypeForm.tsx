'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  FileText, 
  BookOpen,
  Layers,
  Layout,
  Eye,
  GripVertical,
  Star,
  Clock,
  Settings2,
  SplitSquareVertical
} from 'lucide-react'
import type { BlockDefinition, LayoutConfig } from '@/types/database'
import { normalizeOutputFields } from '@/types/database'
import type { OutputConfig, FieldPlacement, ViewType, PageBreakMode, PageBreakUnit } from '@/types/output-config'
import { 
  DEFAULT_OUTPUT_CONFIG, 
  getFieldsForView, 
  VIEW_TYPE_LABELS,
  VIEW_TYPE_DESCRIPTIONS,
  PAGE_BREAK_MODE_LABELS,
  PAGE_BREAK_MODE_DESCRIPTIONS,
  PAGE_BREAK_UNIT_LABELS,
  PAGE_BREAK_UNIT_DESCRIPTIONS,
  DEFAULT_PAGE_BREAK_CONFIG
} from '@/types/output-config'
import { GridPreview } from '@/components/features/output-preview'
import { getPresetForGroup, PRESET_OPTIONS } from '@/lib/output-presets'

// 3단계 위자드 스텝 정의
const WIZARD_STEPS = [
  { id: 1, title: '기본 설정', icon: FileText },
  { id: 2, title: '출력 설정', icon: Layout },
  { id: 3, title: '뷰 설정', icon: Eye },
]

// 문제 그룹 옵션
const QUESTION_GROUPS = [
  { value: 'csat', label: '수능형', description: '1지문 1문제' },
  { value: 'school_passage', label: '내신-지문단위', description: '1지문 다문제' },
  { value: 'school_sentence', label: '내신-문장단위', description: '문장별 문제' },
  { value: 'study', label: '자습서', description: '해석/어휘/구문' },
]

// 기본 레이아웃 설정 (기존 호환용)
const DEFAULT_LAYOUT: LayoutConfig = {
  placement_mode: 'free_flow',
  columns: 1,
  choice_layout: 'vertical',
  choice_marker: 'number_circle',
  views: {
    student: ['passage', 'choices'],
    answer: ['choices', 'answer'],
    teacher: ['passage', 'choices', 'answer', 'explanation']
  }
}

interface QuestionTypeFormProps {
  initialData?: {
    id?: string
    name: string
    output_type: 'question' | 'study_material'
    question_group: 'csat' | 'school_passage' | 'school_sentence' | 'study'
    required_block_ids: string[]
    layout_config: LayoutConfig
    output_config?: OutputConfig | null
  }
  onSave: (data: FormData) => Promise<void>
  onCancel: () => void
}

interface FormData {
  name: string
  output_type: 'question' | 'study_material'
  question_group: 'csat' | 'school_passage' | 'school_sentence' | 'study'
  required_block_ids: string[]
  layout_config: LayoutConfig
  output_config: OutputConfig
}

export function QuestionTypeForm({ initialData, onSave, onCancel }: QuestionTypeFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [blocks, setBlocks] = useState<BlockDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // 초기 OutputConfig 설정 (fields 정규화 포함)
  const getInitialOutputConfig = (question_group?: string): OutputConfig => {
    if (initialData?.output_config) {
      const config = { ...initialData.output_config }
      const allViews = Object.keys(VIEW_TYPE_LABELS) as ViewType[]
      
      // fields 정규화
      if (config.fields && Array.isArray(config.fields)) {
        config.fields = config.fields.map(field => {
          // key가 JSON 문자열인 경우 파싱
          let key = field.key
          let label = field.label
          
          if (typeof key === 'string' && key.startsWith('{') && key.includes('"key"')) {
            try {
              const parsed = JSON.parse(key)
              key = parsed.key || key
              label = label || parsed.label || key
            } catch {
              // 파싱 실패 시 원래 값 유지
            }
          }
          
          // showIn 처리: undefined/null → 전체 뷰, 빈 배열 → 그대로 유지
          let showIn = field.showIn
          if (showIn === undefined || showIn === null) {
            showIn = allViews  // 전체 뷰에 표시
          }
          // 빈 배열([])은 그대로 유지 (아무 뷰에도 표시 안함)
          
          return {
            ...field,
            key,
            label: label || key,
            showIn
          }
        })
      }
      
      console.log('[QuestionTypeForm] Loaded output_config:', 
        config.fields?.slice(0, 2).map(f => `${f.key}: showIn=${JSON.stringify(f.showIn)}`)
      )
      
      return config
    }
    
    // ⭐ 새로 생성 시: question_group에 맞는 프리셋 자동 적용
    if (question_group) {
      const preset = getPresetForGroup(question_group)
      console.log(`[QuestionTypeForm] Applying preset for group: ${question_group}`)
      return preset
    }
    
    return { ...DEFAULT_OUTPUT_CONFIG }
  }
  
  const [formData, setFormData] = useState<FormData>(() => {
    const initialGroup = initialData?.question_group || 'csat'
    return {
      name: initialData?.name || '',
      output_type: initialData?.output_type || 'question',
      question_group: initialGroup,
      required_block_ids: initialData?.required_block_ids || [],
      layout_config: initialData?.layout_config || DEFAULT_LAYOUT,
      // ⭐ 프리셋 자동 적용
      output_config: getInitialOutputConfig(initialGroup),
    }
  })
  
  // 블록 목록 로드
  useEffect(() => {
    const fetchBlocks = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/block-definitions?active=true')
        if (response.ok) {
          const data = await response.json()
          setBlocks(data)
        }
      } catch (error) {
        console.error('Failed to fetch blocks:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBlocks()
  }, [])
  
  // 선택된 블록
  const selectedBlock = blocks.find(b => formData.required_block_ids.includes(b.id))
  
  // 블록 기반 출력 필드 목록 생성
  const availableFields = useMemo(() => {
    if (!selectedBlock?.output_fields) return []
    
    // 정규화: 구버전과 신버전 모두 지원
    const normalizedFields = normalizeOutputFields(selectedBlock.output_fields)
    
    // OutputField를 { key, label } 형식으로 변환
    const mappedFields = normalizedFields.map(field => ({
      key: field.key,
      label: field.label || field.key
    }))
    
    // passage 필드가 없으면 자동 추가
    const hasPassage = mappedFields.some(f => 
      f.key === 'passage' || f.key === 'body'
    )
    
    if (!hasPassage) {
      return [{ key: 'passage', label: '지문' }, ...mappedFields]
    }
    
    return mappedFields
  }, [selectedBlock])
  
  // 초기 데이터 로드 완료 플래그
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false)
  
  // 선택된 블록 변경 시 필드 초기화
  useEffect(() => {
    // 초기 데이터가 있고, 아직 로드되지 않았으면 스킵 (getInitialOutputConfig에서 이미 처리)
    if (initialData?.output_config && !isInitialDataLoaded) {
      if (blocks.length > 0) {
        setIsInitialDataLoaded(true)
      }
      return  // ⭐ 초기 로드 시에는 fields 업데이트 안함!
    }
    
    // 새 문제 유형 생성 or 블록 변경 시에만 fields 업데이트
    if (availableFields.length > 0 && formData.required_block_ids.length > 0) {
      const currentFieldKeys = formData.output_config.fields.map(f => f.key)
      const newFieldKeys = availableFields.map((f: { key: string }) => f.key)
      
      // 필드 구성이 같으면 업데이트 불필요
      const sameFields = currentFieldKeys.length === newFieldKeys.length &&
        newFieldKeys.every(key => currentFieldKeys.includes(key))
      
      if (!sameFields) {
        // 기존 필드의 showIn 설정 보존
        const existingShowIn = new Map(
          formData.output_config.fields.map(f => [f.key, f.showIn])
        )
        
        const newFields: FieldPlacement[] = availableFields.map((f: { key: string; label?: string }) => ({
          key: f.key,
          label: f.label || f.key,
          showIn: existingShowIn.get(f.key) ?? getDefaultShowIn(f.key)
        }))
        
        setFormData(prev => ({
          ...prev,
          output_config: {
            ...prev.output_config,
            fields: newFields
          }
        }))
      }
    }
  }, [availableFields, formData.required_block_ids, blocks.length, isInitialDataLoaded, initialData])
  
  // 필드별 기본 뷰 설정
  const getDefaultShowIn = (key: string): ViewType[] => {
    const allViews = Object.keys(VIEW_TYPE_LABELS) as ViewType[]
    
    if (key === 'answer') return ['student_answer', 'teacher', 'answer_only']
    if (key === 'explanation') return ['teacher']
    return allViews // ⭐ 전체 뷰에 표시 (undefined 대신 명시적 배열)
  }
  
  // 선택지 필드 존재 여부
  const hasChoices = selectedBlock?.output_fields?.some(
    (f: { key: string } | string) => {
      const key = typeof f === 'string' ? f : f.key
      return key === 'choices'
    }
  )
  
  // 총 스텝 수
  const totalSteps = 3
  
  // 자습서형 여부 (뷰 설정 표시 여부)
  const isStudyMaterial = formData.output_type === 'study_material'
  
  // 다음 단계로
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }
  
  // 이전 단계로
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  // 저장
  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('문제 유형 이름을 입력해주세요.')
      return
    }
    if (formData.required_block_ids.length === 0) {
      alert('블록을 선택해주세요.')
      return
    }
    
    // 디버깅: 저장 데이터 확인
    console.log('[QuestionTypeForm] Saving:', 
      formData.output_config.fields.map(f => `${f.key}: showIn=${JSON.stringify(f.showIn)}`)
    )
    
    setIsSaving(true)
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Failed to save:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }
  
  // 필드 순서 변경 (드래그 앤 드롭 대신 버튼으로)
  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...formData.output_config.fields]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= newFields.length) return
    
    ;[newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]]
    
    setFormData(prev => ({
      ...prev,
      output_config: {
        ...prev.output_config,
        fields: newFields
      }
    }))
  }
  
  // 필드 span 변경
  const toggleFieldSpan = (index: number) => {
    const newFields = [...formData.output_config.fields]
    newFields[index] = {
      ...newFields[index],
      span: newFields[index].span === 2 ? 1 : 2
    }
    
    setFormData(prev => ({
      ...prev,
      output_config: {
        ...prev.output_config,
        fields: newFields
      }
    }))
  }
  
  // 필드 뷰 설정 변경
  const toggleFieldView = (fieldIndex: number, viewType: ViewType) => {
    const newFields = [...formData.output_config.fields]
    const field = newFields[fieldIndex]
    const currentShowIn = field.showIn || []
    
    if (currentShowIn.includes(viewType)) {
      // 제거
      const newShowIn = currentShowIn.filter(v => v !== viewType)
      newFields[fieldIndex] = {
        ...field,
        showIn: newShowIn.length > 0 ? newShowIn : []  // ⭐ 빈 배열 유지 (undefined 대신)
      }
    } else {
      // 추가
      newFields[fieldIndex] = {
        ...field,
        showIn: [...currentShowIn, viewType]
      }
    }
    
    setFormData(prev => ({
      ...prev,
      output_config: {
        ...prev.output_config,
        fields: newFields
      }
    }))
  }
  
  // 필드가 특정 뷰에 표시되는지 확인
  const isFieldVisibleInView = (field: FieldPlacement, viewType: ViewType): boolean => {
    if (!field.showIn || field.showIn.length === 0) {
      // ⭐ showIn이 비어있으면 아무 뷰에도 표시 안함
      return false
    }
    return field.showIn.includes(viewType)
  }
  
  return (
    <div className="space-y-6">
      {/* 스텝 인디케이터 */}
      <div className="flex items-center justify-between mb-8">
        {WIZARD_STEPS.slice(0, totalSteps).map((step, index) => {
          const StepIcon = step.icon
          const isActive = currentStep === step.id
          const isCompleted = currentStep > step.id
          
          return (
            <div key={step.id} className="flex items-center">
              <div 
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors cursor-pointer",
                  isActive && "border-blue-500 bg-blue-500 text-white",
                  isCompleted && "border-green-500 bg-green-500 text-white",
                  !isActive && !isCompleted && "border-gray-300 text-gray-400 hover:border-gray-400"
                )}
                onClick={() => setCurrentStep(step.id)}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>
              <span className={cn(
                "ml-2 text-sm font-medium",
                isActive && "text-blue-600",
                isCompleted && "text-green-600",
                !isActive && !isCompleted && "text-gray-400"
              )}>
                {step.title}
              </span>
              {index < totalSteps - 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-4",
                  currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                )} />
              )}
            </div>
          )
        })}
      </div>
      
      {/* 문제 유형 이름 (항상 표시) */}
      <div className="mb-6">
        <Label htmlFor="name">문제 유형 이름</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="예: 수능-빈칸추론"
          className="mt-1"
        />
      </div>
      
      {/* Step 1: 기본 설정 (유형 + 블록 선택) */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* 출력 유형 선택 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                출력 유형
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={formData.output_type}
                onValueChange={(value: 'question' | 'study_material') => 
                  setFormData(prev => ({ ...prev, output_type: value }))
                }
                className="grid grid-cols-2 gap-3"
              >
                <label className={cn(
                  "flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all",
                  formData.output_type === 'question' 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}>
                  <RadioGroupItem value="question" className="sr-only" />
                  <FileText className="w-6 h-6 mr-2 text-blue-500" />
                  <div>
                    <span className="font-medium">문제형</span>
                    <span className="text-xs text-gray-500 ml-2">정답/해설</span>
                  </div>
                </label>
                
                <label className={cn(
                  "flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all",
                  formData.output_type === 'study_material' 
                    ? "border-blue-500 bg-blue-50" 
                    : "border-gray-200 hover:border-gray-300"
                )}>
                  <RadioGroupItem value="study_material" className="sr-only" />
                  <BookOpen className="w-6 h-6 mr-2 text-green-500" />
                  <div>
                    <span className="font-medium">자습서형</span>
                    <span className="text-xs text-gray-500 ml-2">해석/어휘</span>
                  </div>
                </label>
              </RadioGroup>
              
              {/* 문제 그룹 선택 (문제형일 때만) */}
              {formData.output_type === 'question' && (
                <div className="mt-4 pt-4 border-t">
                  <Label className="mb-2 block text-sm">문제 그룹</Label>
                  <RadioGroup
                    value={formData.question_group}
                    onValueChange={(value: 'csat' | 'school_passage' | 'school_sentence' | 'study') => {
                      // ⭐ question_group 변경 시 프리셋 자동 적용
                      const preset = getPresetForGroup(value)
                      setFormData(prev => ({
                        ...prev,
                        question_group: value,
                        output_config: {
                          ...preset,
                          // 기존 필드 설정 유지 (블록 선택되어 있으면)
                          fields: prev.output_config.fields.length > 0 
                            ? prev.output_config.fields 
                            : preset.fields
                        }
                      }))
                    }}
                    className="grid grid-cols-3 gap-2"
                  >
                    {QUESTION_GROUPS.filter(g => g.value !== 'study').map(group => (
                      <label
                        key={group.value}
                        className={cn(
                          "flex flex-col items-center p-2 border rounded-lg cursor-pointer transition-all text-center",
                          formData.question_group === group.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <RadioGroupItem value={group.value} className="sr-only" />
                        <span className="text-sm font-medium">{group.label}</span>
                        <span className="text-xs text-gray-500">{group.description}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 블록 선택 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4" />
                블록 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">로딩 중...</div>
              ) : blocks.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  등록된 블록이 없습니다.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {blocks.map(block => (
                    <label
                      key={block.id}
                      className={cn(
                        "flex items-start p-3 border rounded-lg cursor-pointer transition-all",
                        formData.required_block_ids.includes(block.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="block"
                        checked={formData.required_block_ids.includes(block.id)}
                        onChange={() => setFormData(prev => ({
                          ...prev,
                          required_block_ids: [block.id]
                        }))}
                        className="mt-0.5 mr-2"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-sm">{block.label}</span>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            block.type === 'single' 
                              ? "bg-gray-100 text-gray-600" 
                              : "bg-purple-100 text-purple-600"
                          )}>
                            {block.type === 'single' ? '단일' : '묶음'}
                          </span>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            block.unit === 'passage' 
                              ? "bg-blue-100 text-blue-600" 
                              : "bg-orange-100 text-orange-600"
                          )}>
                            {block.unit === 'passage' ? '지문' : '문장'}
                          </span>
                        </div>
                        {/* 출력 필드 목록 */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {!normalizeOutputFields(block.output_fields).some(f => 
                            f.key === 'passage' || f.key === 'body'
                          ) && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                              passage
                            </span>
                          )}
                          {normalizeOutputFields(block.output_fields).map((field, idx) => (
                            <span 
                              key={idx}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                field.key === 'passage' || field.key === 'body'
                                  ? 'bg-blue-100 text-blue-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {field.key}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Step 2: 출력 설정 (새로운 OutputConfig) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* 그리드 설정 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layout className="w-4 h-4" />
                그리드 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 열 개수 */}
              <div>
                <Label className="mb-2 block text-sm">열 개수</Label>
                <RadioGroup
                  value={String(formData.output_config.columns)}
                  onValueChange={(value) => 
                    setFormData(prev => ({
                      ...prev,
                      output_config: { 
                        ...prev.output_config, 
                        columns: parseInt(value) as 1 | 2 
                      }
                    }))
                  }
                  className="flex gap-3"
                >
                  <label className={cn(
                    "flex-1 flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all",
                    formData.output_config.columns === 1
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}>
                    <RadioGroupItem value="1" className="sr-only" />
                    <div className="w-12 h-16 border-2 border-gray-400 rounded mb-2 bg-white" />
                    <span className="text-sm font-medium">1열</span>
                    <span className="text-xs text-gray-500">기본 레이아웃</span>
                  </label>
                  
                  <label className={cn(
                    "flex-1 flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all",
                    formData.output_config.columns === 2
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}>
                    <RadioGroupItem value="2" className="sr-only" />
                    <div className="flex gap-1 mb-2">
                      <div className="w-5 h-16 border-2 border-gray-400 rounded bg-white" />
                      <div className="w-5 h-16 border-2 border-gray-400 rounded bg-white" />
                    </div>
                    <span className="text-sm font-medium">2열</span>
                    <span className="text-xs text-gray-500">수능형/병렬</span>
                  </label>
                </RadioGroup>
              </div>
              
              {/* 병렬 모드 (2열일 때만) */}
              {formData.output_config.columns === 2 && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="parallel"
                      checked={formData.output_config.parallel || false}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({
                          ...prev,
                          output_config: { 
                            ...prev.output_config, 
                            parallel: !!checked 
                          }
                        }))
                      }
                    />
                    <Label htmlFor="parallel" className="text-sm cursor-pointer">
                      병렬 모드 (쌍으로 묶음 - 한줄해석용)
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    영어-한글 쌍이 좌우로 나란히 배치됩니다
                  </p>
                </div>
              )}
              
              {/* 반복 모드 */}
              <div className="pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="repeat"
                    checked={formData.output_config.repeat || false}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({
                        ...prev,
                        output_config: { 
                          ...prev.output_config, 
                          repeat: !!checked 
                        }
                      }))
                    }
                  />
                  <Label htmlFor="repeat" className="text-sm cursor-pointer">
                    반복 모드 (문장별 반복 - 문장분석용)
                  </Label>
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  각 문장마다 필드 세트가 반복됩니다
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 페이지 분할 설정 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4" />
                페이지 분할
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 분할 모드 */}
              <div>
                <Label className="mb-2 block text-sm">분할 모드</Label>
                <RadioGroup
                  value={formData.output_config.pageBreak?.mode || 'smart'}
                  onValueChange={(value: PageBreakMode) => 
                    setFormData(prev => ({
                      ...prev,
                      output_config: { 
                        ...prev.output_config, 
                        pageBreak: {
                          ...DEFAULT_PAGE_BREAK_CONFIG,
                          ...prev.output_config.pageBreak,
                          mode: value
                        }
                      }
                    }))
                  }
                  className="flex gap-3"
                >
                  {(['flow', 'smart'] as PageBreakMode[]).map(mode => (
                    <label 
                      key={mode}
                      className={cn(
                        "flex-1 flex flex-col p-3 border-2 rounded-lg cursor-pointer transition-all",
                        formData.output_config.pageBreak?.mode === mode
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <RadioGroupItem value={mode} className="sr-only" />
                      <span className="font-medium text-sm">{PAGE_BREAK_MODE_LABELS[mode]}</span>
                      <span className="text-xs text-gray-500 mt-1">{PAGE_BREAK_MODE_DESCRIPTIONS[mode]}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              
              {/* Smart 모드 옵션 */}
              {formData.output_config.pageBreak?.mode === 'smart' && (
                <>
                  {/* 분할 단위 */}
                  <div className="pt-3 border-t">
                    <Label className="mb-2 block text-sm">분할 단위</Label>
                    <RadioGroup
                      value={formData.output_config.pageBreak?.unit || 'passage'}
                      onValueChange={(value: PageBreakUnit) => 
                        setFormData(prev => ({
                          ...prev,
                          output_config: { 
                            ...prev.output_config, 
                            pageBreak: {
                              ...DEFAULT_PAGE_BREAK_CONFIG,
                              ...prev.output_config.pageBreak,
                              unit: value
                            }
                          }
                        }))
                      }
                      className="space-y-2"
                    >
                      {(['passage', 'sentence', 'item'] as PageBreakUnit[]).map(unit => (
                        <label 
                          key={unit}
                          className={cn(
                            "flex items-start p-2 border rounded-lg cursor-pointer transition-all",
                            formData.output_config.pageBreak?.unit === unit
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <RadioGroupItem value={unit} className="mt-0.5 mr-2" />
                          <div>
                            <span className="font-medium text-sm">{PAGE_BREAK_UNIT_LABELS[unit]}</span>
                            <span className="text-xs text-gray-500 ml-2">{PAGE_BREAK_UNIT_DESCRIPTIONS[unit]}</span>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  {/* 탄력성 조절 */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm">탄력성 조절</Label>
                      <span className="text-sm font-medium text-blue-600">
                        {formData.output_config.pageBreak?.minSpaceThreshold || 50}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="70"
                      step="10"
                      value={formData.output_config.pageBreak?.minSpaceThreshold || 50}
                      onChange={(e) => 
                        setFormData(prev => ({
                          ...prev,
                          output_config: { 
                            ...prev.output_config, 
                            pageBreak: {
                              ...DEFAULT_PAGE_BREAK_CONFIG,
                              ...prev.output_config.pageBreak,
                              minSpaceThreshold: parseInt(e.target.value)
                            }
                          }
                        }))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>빈틈없이 (30%)</span>
                      <span>여유있게 (70%)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      남은 공간이 이 값보다 적으면 새 페이지/열로 이동합니다
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 필드 순서 설정 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="w-4 h-4" />
                필드 순서
                {formData.output_config.columns === 2 && (
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    (span 체크 시 2열 전체 사용)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.output_config.fields.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  블록을 먼저 선택해주세요.
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.output_config.fields.map((field, idx) => (
                    <div 
                      key={field.key}
                      className={cn(
                        "flex items-center gap-2 p-2 border rounded-lg bg-gray-50",
                        field.span === 2 && formData.output_config.columns === 2 && "bg-blue-50 border-blue-200"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => moveField(idx, 'up')}
                          disabled={idx === 0}
                        >
                          ▲
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => moveField(idx, 'down')}
                          disabled={idx === formData.output_config.fields.length - 1}
                        >
                          ▼
                        </Button>
                      </div>
                      
                      <span className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </span>
                      
                      <div className="flex-1">
                        <span className="font-medium text-sm">{field.label || field.key}</span>
                        <span className="text-xs text-gray-500 ml-2">({field.key})</span>
                      </div>
                      
                      {/* 2열일 때 span 옵션 */}
                      {formData.output_config.columns === 2 && (
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`span-${field.key}`}
                            checked={field.span === 2}
                            onCheckedChange={() => toggleFieldSpan(idx)}
                          />
                          <Label htmlFor={`span-${field.key}`} className="text-xs cursor-pointer">
                            전체너비
                          </Label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 선택지 설정 */}
          {hasChoices && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  선택지 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2 block text-sm">배열 방식</Label>
                    <RadioGroup
                      value={formData.output_config.options.choiceLayout}
                      onValueChange={(value: 'vertical' | 'horizontal') => 
                        setFormData(prev => ({
                          ...prev,
                          output_config: {
                            ...prev.output_config,
                            options: { ...prev.output_config.options, choiceLayout: value }
                          }
                        }))
                      }
                      className="flex gap-2"
                    >
                      <label className={cn(
                        "flex items-center p-2 border rounded cursor-pointer flex-1 text-sm",
                        formData.output_config.options.choiceLayout === 'vertical'
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      )}>
                        <RadioGroupItem value="vertical" className="mr-1.5 scale-90" />
                        세로
                      </label>
                      <label className={cn(
                        "flex items-center p-2 border rounded cursor-pointer flex-1 text-sm",
                        formData.output_config.options.choiceLayout === 'horizontal'
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      )}>
                        <RadioGroupItem value="horizontal" className="mr-1.5 scale-90" />
                        가로
                      </label>
                    </RadioGroup>
                  </div>
                  
                  <div>
                    <Label className="mb-2 block text-sm">마커 스타일</Label>
                    <RadioGroup
                      value={formData.output_config.options.choiceMarker}
                      onValueChange={(value: 'circled' | 'numbered' | 'parenthesis') => 
                        setFormData(prev => ({
                          ...prev,
                          output_config: {
                            ...prev.output_config,
                            options: { ...prev.output_config.options, choiceMarker: value }
                          }
                        }))
                      }
                      className="flex gap-2"
                    >
                      <label className={cn(
                        "flex items-center p-2 border rounded cursor-pointer text-sm",
                        formData.output_config.options.choiceMarker === 'circled'
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      )}>
                        <RadioGroupItem value="circled" className="mr-1 scale-90" />
                        ①②③
                      </label>
                      <label className={cn(
                        "flex items-center p-2 border rounded cursor-pointer text-sm",
                        formData.output_config.options.choiceMarker === 'numbered'
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      )}>
                        <RadioGroupItem value="numbered" className="mr-1 scale-90" />
                        1.2.3.
                      </label>
                      <label className={cn(
                        "flex items-center p-2 border rounded cursor-pointer text-sm",
                        formData.output_config.options.choiceMarker === 'parenthesis'
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      )}>
                        <RadioGroupItem value="parenthesis" className="mr-1 scale-90" />
                        (1)(2)
                      </label>
                    </RadioGroup>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 실시간 미리보기 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                미리보기 (학생용)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
                <div className="max-h-[400px] overflow-auto">
                  <GridPreview 
                    config={formData.output_config} 
                    viewType="student"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * 샘플 데이터로 미리보기가 표시됩니다. 실제 출력 결과와 다를 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Step 3: 뷰 설정 */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                뷰별 필드 표시 설정
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.output_config.fields.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  블록을 먼저 선택해주세요.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">필드</th>
                        {(Object.keys(VIEW_TYPE_LABELS) as ViewType[]).map(viewType => (
                          <th key={viewType} className="text-center p-2 font-medium">
                            <div className="flex flex-col">
                              <span>{VIEW_TYPE_LABELS[viewType].split(' ')[0]}</span>
                              <span className="text-xs font-normal text-gray-500">
                                {VIEW_TYPE_LABELS[viewType].includes('(') 
                                  ? VIEW_TYPE_LABELS[viewType].match(/\(([^)]+)\)/)?.[1] 
                                  : ''}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {formData.output_config.fields.map((field, fieldIdx) => (
                        <tr key={field.key} className="border-b">
                          <td className="p-2">
                            <span className="font-medium">{field.label || field.key}</span>
                            <span className="text-xs text-gray-500 ml-1">({field.key})</span>
                          </td>
                          {(Object.keys(VIEW_TYPE_LABELS) as ViewType[]).map(viewType => {
                            const isVisible = isFieldVisibleInView(field, viewType)
                            
                            return (
                              <td key={viewType} className="text-center p-2">
                                <Checkbox
                                  checked={isVisible}
                                  onCheckedChange={() => {
                                    toggleFieldView(fieldIdx, viewType)
                                  }}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* 뷰 타입 설명 */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <p className="text-xs font-medium text-gray-600">뷰 타입 설명:</p>
                {(Object.keys(VIEW_TYPE_LABELS) as ViewType[]).map(viewType => (
                  <div key={viewType} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium">{VIEW_TYPE_LABELS[viewType]}:</span>
                    <span>{VIEW_TYPE_DESCRIPTIONS[viewType]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 용지 설정 (선택적) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                용지 설정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-sm">용지 크기</Label>
                  <RadioGroup
                    value={formData.output_config.paper.size}
                    onValueChange={(value: 'A4' | 'B5') => 
                      setFormData(prev => ({
                        ...prev,
                        output_config: {
                          ...prev.output_config,
                          paper: { ...prev.output_config.paper, size: value }
                        }
                      }))
                    }
                    className="flex gap-2"
                  >
                    <label className={cn(
                      "flex items-center p-2 border rounded cursor-pointer flex-1 text-sm",
                      formData.output_config.paper.size === 'A4'
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    )}>
                      <RadioGroupItem value="A4" className="mr-1.5 scale-90" />
                      A4
                    </label>
                    <label className={cn(
                      "flex items-center p-2 border rounded cursor-pointer flex-1 text-sm",
                      formData.output_config.paper.size === 'B5'
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    )}>
                      <RadioGroupItem value="B5" className="mr-1.5 scale-90" />
                      B5
                    </label>
                  </RadioGroup>
                </div>
                
                <div>
                  <Label className="mb-2 block text-sm">방향</Label>
                  <RadioGroup
                    value={formData.output_config.paper.orientation}
                    onValueChange={(value: 'portrait' | 'landscape') => 
                      setFormData(prev => ({
                        ...prev,
                        output_config: {
                          ...prev.output_config,
                          paper: { ...prev.output_config.paper, orientation: value }
                        }
                      }))
                    }
                    className="flex gap-2"
                  >
                    <label className={cn(
                      "flex items-center p-2 border rounded cursor-pointer flex-1 text-sm",
                      formData.output_config.paper.orientation === 'portrait'
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    )}>
                      <RadioGroupItem value="portrait" className="mr-1.5 scale-90" />
                      세로
                    </label>
                    <label className={cn(
                      "flex items-center p-2 border rounded cursor-pointer flex-1 text-sm",
                      formData.output_config.paper.orientation === 'landscape'
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    )}>
                      <RadioGroupItem value="landscape" className="mr-1.5 scale-90" />
                      가로
                    </label>
                  </RadioGroup>
                </div>
              </div>
              
              {/* 여백 설정 */}
              <div>
                <Label className="mb-2 block text-sm">여백 (mm)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                    <div key={side} className="flex flex-col">
                      <span className="text-xs text-gray-500 mb-1">
                        {side === 'top' ? '상' : side === 'right' ? '우' : side === 'bottom' ? '하' : '좌'}
                      </span>
                      <Input
                        type="number"
                        min={5}
                        max={50}
                        value={formData.output_config.paper.margins[side]}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          output_config: {
                            ...prev.output_config,
                            paper: {
                              ...prev.output_config.paper,
                              margins: {
                                ...prev.output_config.paper.margins,
                                [side]: parseInt(e.target.value) || 15
                              }
                            }
                          }
                        }))}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* 네비게이션 버튼 */}
      <div className="flex justify-between pt-4 border-t">
        <div>
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>
          ) : (
            <Button variant="outline" onClick={onCancel}>
              취소
            </Button>
          )}
        </div>
        <div>
          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              다음
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
              <Check className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
