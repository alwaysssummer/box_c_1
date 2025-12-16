'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { 
  Save, 
  X, 
  Play,
  Layers,
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Eye,
  BookOpen
} from 'lucide-react'
import type { BlockDefinition, OutputField } from '@/types/database'
import { normalizeOutputFields } from '@/types/database'
import { AI_MODELS, type ModelId } from '@/types'

interface BlockFormProps {
  block: BlockDefinition | null
  isEditing: boolean
  onSave: (data: BlockFormData) => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
}

interface BlockFormData {
  id: string | null
  label: string
  type: 'single' | 'bundle'
  unit: 'passage' | 'sentence'
  prompt: string
  output_fields: OutputField[]
  description: string
  is_active: boolean
  modifies_passage: boolean  // 지문 가공 여부
}

interface TestResult {
  success: boolean
  content?: Record<string, unknown>
  rawContent?: string
  detectedFields?: Array<{ key: string; type: string; sample?: unknown }>
  error?: string
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number }
  responseTime: number
  model: string
}

interface PassageOption {
  id: string
  name: string
  textbook_name?: string
  unit_name?: string
}

const DEFAULT_FORM_DATA: BlockFormData = {
  id: null,
  label: '',
  type: 'bundle',
  unit: 'passage',
  prompt: '',
  output_fields: [],
  description: '',
  is_active: true,
  modifies_passage: false,  // 기본값: 원본 지문 사용
}

export function BlockForm({ 
  block, 
  isEditing, 
  onSave, 
  onDelete, 
  onEdit,
  onCancel 
}: BlockFormProps) {
  const [formData, setFormData] = useState<BlockFormData>(DEFAULT_FORM_DATA)
  const [isSaving, setIsSaving] = useState(false)
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldType, setNewFieldType] = useState<OutputField['type']>('text')
  
  // 테스트 관련 상태
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testModel, setTestModel] = useState<ModelId>('gemini-2.0-flash')
  const [passages, setPassages] = useState<PassageOption[]>([])
  const [selectedPassageId, setSelectedPassageId] = useState<string>('')
  const [passageSearch, setPassageSearch] = useState('')
  const [isLoadingPassages, setIsLoadingPassages] = useState(false)
  
  // 프롬프트 개선 관련 상태
  const [improvementInstruction, setImprovementInstruction] = useState('')
  const [isImproving, setIsImproving] = useState(false)
  
  // 미리보기 관련 상태
  const [showPreview, setShowPreview] = useState(false)
  const [previewPassageContent, setPreviewPassageContent] = useState<string>('')
  
  // 블록 데이터 로드
  useEffect(() => {
    if (block) {
      console.log('[BlockForm] Loading block data:', {
        id: block.id,
        label: block.label,
        output_fields: block.output_fields,
        count: block.output_fields?.length
      })
      
      // normalizeOutputFields로 JSON 문자열 파싱
      const normalizedFields = normalizeOutputFields(block.output_fields)
      console.log('[BlockForm] Normalized fields:', {
        original: block.output_fields,
        normalized: normalizedFields,
        count: normalizedFields.length
      })
      
      setFormData({
        id: block.id,
        label: block.label,
        type: block.type,
        unit: block.unit,
        prompt: block.prompt,
        output_fields: normalizedFields,
        description: block.description || '',
        is_active: block.is_active,
        modifies_passage: block.modifies_passage ?? false,
      })
    } else {
      setFormData(DEFAULT_FORM_DATA)
    }
  }, [block])
  
  // 지문 목록 로드 (테스트 패널 열릴 때)
  useEffect(() => {
    if (showTestPanel && passages.length === 0) {
      loadPassages()
    }
  }, [showTestPanel])
  
  const loadPassages = async () => {
    setIsLoadingPassages(true)
    try {
      // 최근 지문 20개 가져오기
      const response = await fetch('/api/passages?limit=20')
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
  
  const handleSave = async () => {
    if (!formData.label.trim()) {
      alert('블록 이름을 입력해주세요.')
      return
    }
    if (!formData.prompt.trim()) {
      alert('프롬프트를 입력해주세요.')
      return
    }
    
    // {{ passage }} 플레이스홀더 검증
    if (!hasPassagePlaceholder) {
      const confirmed = window.confirm(
        '⚠️ 프롬프트에 {{ passage }} 플레이스홀더가 없습니다!\n\n' +
        '이 플레이스홀더가 없으면 지문 내용이 AI에 전달되지 않아 올바른 문제가 생성되지 않습니다.\n\n' +
        '그래도 저장하시겠습니까?'
      )
      if (!confirmed) return
    }
    
    console.log('[BlockForm] Saving formData:', {
      id: formData.id,
      label: formData.label,
      output_fields: formData.output_fields,
      output_fields_count: formData.output_fields.length
    })
    
    setIsSaving(true)
    try {
      await onSave(formData)
    } catch (error) {
      console.error('Failed to save:', error)
      const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.'
      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleAddField = () => {
    if (!newFieldKey.trim()) return
    
    // 중복 검사
    if (formData.output_fields.some(f => f.key === newFieldKey.trim())) {
      alert('이미 존재하는 필드명입니다.')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      output_fields: [...prev.output_fields, { key: newFieldKey.trim(), type: newFieldType }]
    }))
    setNewFieldKey('')
    setNewFieldType('text')
  }
  
  const handleRemoveField = (key: string) => {
    setFormData(prev => ({
      ...prev,
      output_fields: prev.output_fields.filter(f => f.key !== key)
    }))
  }
  
  // 테스트 실행
  const handleTest = async () => {
    if (!formData.prompt.trim()) {
      alert('프롬프트를 입력해주세요.')
      return
    }
    if (!selectedPassageId) {
      alert('테스트할 지문을 선택해주세요.')
      return
    }
    
    // {{ passage }} 플레이스홀더 검증
    if (!hasPassagePlaceholder) {
      alert(
        '⚠️ 프롬프트에 {{ passage }} 플레이스홀더가 없습니다!\n\n' +
        '이 플레이스홀더가 없으면 지문 내용이 AI에 전달되지 않습니다.\n' +
        '프롬프트에 {{ passage }}를 추가한 후 다시 테스트해주세요.'
      )
      return
    }
    
    setIsTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/block-definitions/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: formData.prompt,
          passage_id: selectedPassageId,
          model: testModel,
        }),
      })
      
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
        responseTime: 0,
        model: testModel,
      })
    } finally {
      setIsTesting(false)
    }
  }
  
  // 감지된 필드 적용
  const handleApplyDetectedFields = () => {
    if (!testResult?.detectedFields) return
    
    const newFields: OutputField[] = testResult.detectedFields.map(f => ({
      key: f.key,
      type: f.type as OutputField['type'],
      sample: f.sample as OutputField['sample'],
    }))
    
    // passage 필드가 없으면 자동 추가 (문제 유형 레이아웃 연동을 위해 필수)
    const hasPassage = newFields.some(f => f.key === 'passage' || f.key === 'body')
    if (!hasPassage) {
      newFields.unshift({ key: 'passage', type: 'text' })
    }
    
    setFormData(prev => ({
      ...prev,
      output_fields: newFields,
    }))
  }
  
  // 프롬프트 개선 요청
  const handleImprovePrompt = async () => {
    if (!improvementInstruction.trim()) {
      alert('개선 지시사항을 입력해주세요.')
      return
    }
    if (!formData.prompt.trim()) {
      alert('개선할 프롬프트가 없습니다.')
      return
    }
    
    setIsImproving(true)
    try {
      const response = await fetch('/api/block-definitions/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: formData.prompt,
          instruction: improvementInstruction,
          model: testModel,
        }),
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || '프롬프트 개선 실패')
      }
      
      // 개선된 프롬프트 적용
      setFormData(prev => ({
        ...prev,
        prompt: result.improvedPrompt,
      }))
      
      setImprovementInstruction('')
      
      // 자동으로 테스트 실행 (지문이 선택되어 있으면)
      if (selectedPassageId) {
        setShowTestPanel(true)
        // 약간의 딜레이 후 테스트 실행 (프롬프트 업데이트 반영)
        setTimeout(() => {
          handleTest()
        }, 100)
      }
      
    } catch (error) {
      alert(error instanceof Error ? error.message : '프롬프트 개선 중 오류가 발생했습니다.')
    } finally {
      setIsImproving(false)
    }
  }
  
  // 미리보기 열기
  const handleOpenPreview = async () => {
    if (!selectedPassageId) {
      alert('지문을 먼저 선택해주세요.')
      return
    }
    
    // 선택된 지문 내용 가져오기
    try {
      const response = await fetch(`/api/passages/${selectedPassageId}`)
      if (response.ok) {
        const passage = await response.json()
        setPreviewPassageContent(passage.content || '')
      }
    } catch (error) {
      console.error('Failed to load passage:', error)
    }
    
    setShowPreview(true)
  }
  
  const isNew = !block
  const isReadOnly = !isEditing && !isNew
  
  // {{ passage }} 플레이스홀더 검증
  const hasPassagePlaceholder = /\{\{\s*passage\s*\}\}/i.test(formData.prompt)
  
  // 필터된 지문 목록
  const filteredPassages = passages.filter(p => 
    p.name.toLowerCase().includes(passageSearch.toLowerCase()) ||
    p.textbook_name?.toLowerCase().includes(passageSearch.toLowerCase())
  )
  
  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="w-6 h-6" />
          {isNew ? '새 블록 정의' : isEditing ? '블록 수정' : '블록 상세'}
        </h2>
        <div className="flex gap-2">
          {isReadOnly ? (
            <>
              <Button variant="outline" onClick={onEdit}>
                편집
              </Button>
              <Button variant="destructive" onClick={onDelete}>
                삭제
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-1" />
                취소
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="label">블록 이름 *</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                placeholder="예: 빈칸추론"
                disabled={isReadOnly}
                className="mt-1"
              />
            </div>
            <div>
              <Label>블록 유형</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: 'single' | 'bundle') => 
                  setFormData(prev => ({ ...prev, type: value }))
                }
                disabled={isReadOnly}
                className="flex gap-4 mt-2"
              >
                <label className={cn(
                  "flex items-center gap-2 p-2 border rounded cursor-pointer",
                  formData.type === 'single' && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="single" />
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">단일</span>
                </label>
                <label className={cn(
                  "flex items-center gap-2 p-2 border rounded cursor-pointer",
                  formData.type === 'bundle' && "border-primary bg-primary/5"
                )}>
                  <RadioGroupItem value="bundle" />
                  <Layers className="w-4 h-4" />
                  <span className="text-sm">묶음</span>
                </label>
              </RadioGroup>
            </div>
          </div>
          
          <div>
            <Label>대상 단위</Label>
            <RadioGroup
              value={formData.unit}
              onValueChange={(value: 'passage' | 'sentence') => 
                setFormData(prev => ({ ...prev, unit: value }))
              }
              disabled={isReadOnly}
              className="flex gap-4 mt-2"
            >
              <label className={cn(
                "flex items-center gap-2 p-2 border rounded cursor-pointer",
                formData.unit === 'passage' && "border-primary bg-primary/5"
              )}>
                <RadioGroupItem value="passage" />
                <span className="text-sm">지문 (passage)</span>
              </label>
              <label className={cn(
                "flex items-center gap-2 p-2 border rounded cursor-pointer",
                formData.unit === 'sentence' && "border-primary bg-primary/5"
              )}>
                <RadioGroupItem value="sentence" />
                <span className="text-sm">문장 (sentence)</span>
              </label>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
      
      {/* 프롬프트 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">프롬프트 *</CardTitle>
          {!isReadOnly && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTestPanel(!showTestPanel)}
            >
              <Play className="w-4 h-4 mr-1" />
              {showTestPanel ? '테스트 닫기' : '테스트 실행'}
              {showTestPanel ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={formData.prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
            placeholder="AI에게 전달할 지시문을 입력하세요.&#10;&#10;변수: {{passage}} - 지문 내용이 자동 삽입됩니다."
            disabled={isReadOnly}
            className={cn(
              "min-h-[200px] font-mono text-sm",
              !hasPassagePlaceholder && formData.prompt.trim() && "border-amber-500 focus:border-amber-500"
            )}
          />
          
          {/* AI 프롬프트 개선 */}
          {!isReadOnly && formData.prompt.trim() && (
            <div className="flex gap-2 items-center p-3 bg-violet-50 border border-violet-200 rounded-md">
              <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
              <Input
                value={improvementInstruction}
                onChange={(e) => setImprovementInstruction(e.target.value)}
                placeholder="예: passage 필드는 출력하지 마세요"
                className="flex-1 bg-white"
                onKeyDown={(e) => e.key === 'Enter' && !isImproving && handleImprovePrompt()}
                disabled={isImproving}
              />
              <Button 
                size="sm" 
                onClick={handleImprovePrompt}
                disabled={isImproving || !improvementInstruction.trim()}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {isImproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    개선
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* {{ passage }} 플레이스홀더 경고 */}
          {!hasPassagePlaceholder && formData.prompt.trim() ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <span className="text-amber-600 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  프롬프트에 <code className="bg-amber-100 px-1 rounded">{'{{ passage }}'}</code> 가 없습니다!
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  이 플레이스홀더가 없으면 지문 내용이 AI에 전달되지 않아 올바른 문제가 생성되지 않습니다.
                  프롬프트 어딘가에 <code className="bg-amber-100 px-1 rounded">{'{{ passage }}'}</code>를 추가해주세요.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              💡 Tip: <code className="bg-muted px-1 rounded">{'{{passage}}'}</code>를 사용하면 지문 내용이 자동으로 삽입됩니다.
            </p>
          )}
          
          {/* 테스트 패널 */}
          {showTestPanel && (
            <div className="border-t pt-4 mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="font-medium">프롬프트 테스트</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* 지문 선택 */}
                <div>
                  <Label>테스트 지문</Label>
                  <Input
                    placeholder="지문 검색..."
                    value={passageSearch}
                    onChange={(e) => setPassageSearch(e.target.value)}
                    className="mt-1 mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    {isLoadingPassages ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                        로딩 중...
                      </div>
                    ) : filteredPassages.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        지문이 없습니다
                      </div>
                    ) : (
                      filteredPassages.map(p => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedPassageId(p.id)}
                          className={cn(
                            "p-2 cursor-pointer hover:bg-muted/50 border-b last:border-b-0",
                            selectedPassageId === p.id && "bg-primary/10"
                          )}
                        >
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          {p.textbook_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {p.textbook_name}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                {/* 모델 선택 */}
                <div>
                  <Label>AI 모델</Label>
                  <select
                    value={testModel}
                    onChange={(e) => setTestModel(e.target.value as ModelId)}
                    className="w-full mt-1 p-2 border rounded-md bg-background text-sm"
                  >
                    {Object.entries(AI_MODELS).map(([id, model]) => (
                      <option key={id} value={id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  
                  <Button
                    onClick={handleTest}
                    disabled={isTesting || !selectedPassageId}
                    className="w-full mt-4"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        테스트 중...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-1" />
                        테스트 실행
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* 테스트 결과 */}
              {testResult && (
                <div className={cn(
                  "p-4 rounded-lg",
                  testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "font-medium",
                      testResult.success ? "text-green-700" : "text-red-700"
                    )}>
                      {testResult.success ? '✅ 성공' : '❌ 실패'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {testResult.responseTime}ms | {testResult.model}
                      {testResult.usage && ` | ${testResult.usage.totalTokens} tokens`}
                    </span>
                  </div>
                  
                  {testResult.error && (
                    <p className="text-sm text-red-600">{testResult.error}</p>
                  )}
                  
                  {testResult.detectedFields && testResult.detectedFields.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          감지된 필드 ({testResult.detectedFields.length + (testResult.detectedFields.some(f => f.key === 'passage' || f.key === 'body') ? 0 : 1)}개)
                        </span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleOpenPreview}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            미리보기
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={handleApplyDetectedFields}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            필드 적용
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {/* passage 필드 항상 표시 (원본 사용 표시) */}
                        {!testResult.detectedFields.some(f => f.key === 'passage' || f.key === 'body') && (
                          <div className="flex items-center gap-2 text-sm bg-blue-50 p-1.5 rounded border border-blue-200">
                            <code className="bg-white px-1 rounded text-blue-700">passage</code>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                              text
                            </span>
                            <span className="text-xs text-blue-600">
                              📄 {formData.modifies_passage ? 'AI 가공 대기' : '원본 사용'}
                            </span>
                          </div>
                        )}
                        {testResult.detectedFields.map((f, index) => (
                          <div key={f.key || `detected-${index}`} className="flex items-center gap-2 text-sm">
                            <code className="bg-white px-1 rounded">{f.key}</code>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                              {f.type}
                            </span>
                            {f.sample !== undefined && f.sample !== null && (
                              <span className="text-xs text-muted-foreground truncate max-w-xs">
                                {typeof f.sample === 'string' ? f.sample : JSON.stringify(f.sample).substring(0, 50)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {testResult.rawContent && (
                    <details className="mt-3">
                      <summary className="text-sm cursor-pointer text-muted-foreground">
                        원본 응답 보기
                      </summary>
                      <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                        {testResult.rawContent}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 출력 필드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">출력 필드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 필드 목록 */}
          <div className="space-y-2">
            {/* passage 필드 항상 표시 (문제 유형 레이아웃 연동 필수) */}
            {!formData.output_fields.some(f => f.key === 'passage' || f.key === 'body') && (
              <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-blue-700">passage</code>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                    text
                  </span>
                  <span className="text-xs text-blue-600">
                    📄 {formData.modifies_passage ? 'AI 가공' : '원본 사용'}
                  </span>
                </div>
                <span className="text-xs text-blue-500">시스템 필드</span>
              </div>
            )}
            {formData.output_fields.length > 0 ? (
              formData.output_fields.map((field, index) => (
                <div 
                  key={field.key || `field-${index}`} 
                  className={cn(
                    "flex items-center justify-between p-2 rounded",
                    (field.key === 'passage' || field.key === 'body') 
                      ? "bg-blue-50 border border-blue-200" 
                      : "bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <code className={cn(
                      "text-sm font-mono",
                      (field.key === 'passage' || field.key === 'body') && "text-blue-700"
                    )}>{field.key}</code>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      (field.key === 'passage' || field.key === 'body') 
                        ? "bg-blue-100 text-blue-600" 
                        : "bg-gray-200 text-gray-600"
                    )}>
                      {field.type}
                    </span>
                    {(field.key === 'passage' || field.key === 'body') && (
                      <span className="text-xs text-blue-600">
                        📄 {formData.modifies_passage ? 'AI 가공' : '원본 사용'}
                      </span>
                    )}
                  </div>
                  {!isReadOnly && (field.key !== 'passage' && field.key !== 'body') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveField(field.key)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                  {(field.key === 'passage' || field.key === 'body') && (
                    <span className="text-xs text-blue-500">시스템 필드</span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                출력 필드가 없습니다. 테스트를 실행하여 자동 감지하거나 수동으로 추가하세요.
              </p>
            )}
          </div>
          
          {/* 필드 추가 */}
          {!isReadOnly && (
            <div className="flex gap-2 pt-2 border-t">
              <Input
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                placeholder="필드명 (예: choices)"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as OutputField['type'])}
                className="px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="text">text</option>
                <option value="array">array</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="object">object</option>
              </select>
              <Button variant="outline" onClick={handleAddField}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 지문 가공 여부 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="modifies_passage"
              checked={formData.modifies_passage}
              onChange={(e) => setFormData(prev => ({ ...prev, modifies_passage: e.target.checked }))}
              disabled={isReadOnly}
              className="w-4 h-4 mt-1"
            />
            <div>
              <Label htmlFor="modifies_passage" className="cursor-pointer font-medium">
                이 블록은 지문을 가공합니다
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {formData.modifies_passage 
                  ? '✏️ AI가 출력한 지문(빈칸, 순서배열 등)을 사용합니다' 
                  : '📄 원본 지문을 그대로 사용합니다 (기본값, 안전)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 활성화 상태 */}
      {!isNew && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
            disabled={isReadOnly}
            className="w-4 h-4"
          />
          <Label htmlFor="is_active" className="cursor-pointer">
            {formData.is_active ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" /> 활성화됨
              </span>
            ) : (
              <span className="text-muted-foreground">비활성화됨</span>
            )}
          </Label>
        </div>
      )}
      
      {/* 미리보기 모달 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              문제 미리보기
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* 지문 */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  📖 지문 {formData.modifies_passage ? '(AI 가공)' : '(원본)'}
                </h4>
                <div className={cn(
                  "p-4 rounded-lg border text-sm leading-relaxed whitespace-pre-wrap",
                  formData.modifies_passage ? "bg-amber-50 border-amber-200" : "bg-slate-50"
                )}>
                  {formData.modifies_passage 
                    ? ((testResult?.content?.passage as string) || (testResult?.content?.body as string) || previewPassageContent || '가공된 지문 없음')
                    : (previewPassageContent || '지문을 불러오는 중...')}
                </div>
                {formData.modifies_passage && (
                  <p className="text-xs text-amber-600 mt-1">
                    ✏️ "지문 가공" 옵션이 켜져 있어 AI가 출력한 지문을 사용합니다
                  </p>
                )}
              </div>
              
              {/* AI 생성 필드들 */}
              {testResult?.content && (
                <>
                  {/* 문제 */}
                  {testResult.content.question && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        ❓ 문제
                      </h4>
                      <p className="text-sm">{String(testResult.content.question)}</p>
                    </div>
                  )}
                  
                  {/* 선택지 */}
                  {testResult.content.choices && Array.isArray(testResult.content.choices) && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        📝 선택지
                      </h4>
                      <ol className="space-y-1">
                        {(testResult.content.choices as unknown[]).map((choice, idx) => (
                          <li 
                            key={idx} 
                            className={cn(
                              "text-sm flex gap-2 p-2 rounded",
                              testResult.content?.answer === idx + 1 && "bg-green-50 border border-green-200"
                            )}
                          >
                            <span className="font-medium text-muted-foreground">
                              {['①', '②', '③', '④', '⑤'][idx] || `${idx + 1}.`}
                            </span>
                            <span>{String(choice)}</span>
                            {testResult.content?.answer === idx + 1 && (
                              <span className="text-green-600 text-xs ml-auto">✓ 정답</span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {/* 정답 */}
                  {testResult.content.answer !== undefined && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        ✅ 정답
                      </h4>
                      <p className="text-sm font-medium">{String(testResult.content.answer)}</p>
                    </div>
                  )}
                  
                  {/* 해설 */}
                  {testResult.content.explanation && (
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                        💡 해설
                      </h4>
                      <div className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-200">
                        {typeof testResult.content.explanation === 'string' 
                          ? testResult.content.explanation 
                          : (
                            <pre className="whitespace-pre-wrap text-xs">
                              {JSON.stringify(testResult.content.explanation, null, 2)}
                            </pre>
                          )
                        }
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
