'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Loader2,
  Save,
  Trash2,
  Edit,
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuestionTypeItem } from './QuestionTypeList'
import type { DataTypeItem } from '../data-type/DataTypeList'

interface QuestionTypeFormData {
  id: string | null
  name: string
  instruction: string
  dataTypeList: {
    id: string
    dataTypeId: string
    dataTypeName: string
    role: 'body' | 'choices' | 'answer' | 'explanation'
  }[]
  choiceLayout: 'vertical' | 'horizontal' | 'grid2'
  choiceMarker: 'circle' | 'number' | 'alpha' | 'paren'
}

interface QuestionTypeFormProps {
  questionType: QuestionTypeItem | null
  allDataTypes: DataTypeItem[]
  isEditing: boolean
  onSave: (data: QuestionTypeFormData) => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
  layoutOptions: {
    choiceLayout: string
    choiceMarker: string
    onLayoutChange: (layout: string) => void
    onMarkerChange: (marker: string) => void
  }
}

const ROLES = [
  { value: 'body', label: '본문' },
  { value: 'choices', label: '선택지' },
  { value: 'answer', label: '정답' },
  { value: 'explanation', label: '해설' },
]

const initialFormData: QuestionTypeFormData = {
  id: null,
  name: '',
  instruction: '',
  dataTypeList: [],
  choiceLayout: 'vertical',
  choiceMarker: 'circle',
}

export function QuestionTypeForm({
  questionType,
  allDataTypes,
  isEditing,
  onSave,
  onDelete,
  onEdit,
  onCancel,
  layoutOptions,
}: QuestionTypeFormProps) {
  const [formData, setFormData] = useState<QuestionTypeFormData>(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDataTypeSelector, setShowDataTypeSelector] = useState(false)

  useEffect(() => {
    if (questionType) {
      setFormData({
        id: questionType.id,
        name: questionType.name,
        instruction: questionType.instruction || '',
        dataTypeList: questionType.dataTypeList.map((item) => ({
          ...item,
          role: item.role as 'body' | 'choices' | 'answer' | 'explanation',
        })),
        choiceLayout: questionType.choice_layout as 'vertical' | 'horizontal' | 'grid2',
        choiceMarker: questionType.choice_marker as 'circle' | 'number' | 'alpha' | 'paren',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [questionType])

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

    if (confirm(`"${formData.name}" 문제 유형을 삭제하시겠습니까?`)) {
      setIsDeleting(true)
      try {
        await onDelete()
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleAddDataType = (dataType: DataTypeItem) => {
    const newItem = {
      id: `temp-${Date.now()}`,
      dataTypeId: dataType.id,
      dataTypeName: dataType.name,
      role: 'body' as const,
    }
    setFormData((prev) => ({
      ...prev,
      dataTypeList: [...prev.dataTypeList, newItem],
    }))
    setShowDataTypeSelector(false)
  }

  const handleRemoveDataType = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      dataTypeList: prev.dataTypeList.filter((item) => item.id !== itemId),
    }))
  }

  const handleMoveDataType = (index: number, direction: number) => {
    const newList = [...formData.dataTypeList]
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= newList.length) return
    ;[newList[index], newList[newIndex]] = [newList[newIndex], newList[index]]
    setFormData((prev) => ({ ...prev, dataTypeList: newList }))
  }

  const handleChangeRole = (itemId: string, role: string) => {
    setFormData((prev) => ({
      ...prev,
      dataTypeList: prev.dataTypeList.map((item) =>
        item.id === itemId
          ? { ...item, role: role as 'body' | 'choices' | 'answer' | 'explanation' }
          : item
      ),
    }))
  }

  // 의존성 검증
  const validateDependencies = () => {
    const warnings: string[] = []
    const addedIds = formData.dataTypeList.map((item) => item.dataTypeId)

    formData.dataTypeList.forEach((item) => {
      const dataType = allDataTypes.find((dt) => dt.id === item.dataTypeId)
      if (dataType?.has_dependency && dataType.dependsOn.length > 0) {
        dataType.dependsOn.forEach((depId) => {
          if (!addedIds.includes(depId)) {
            const depType = allDataTypes.find((dt) => dt.id === depId)
            warnings.push(
              `"${dataType.name}"은(는) "${depType?.name || '알 수 없음'}"이(가) 필요합니다.`
            )
          }
        })
      }
    })

    return warnings
  }

  const warnings = validateDependencies()

  return (
    <div className="flex gap-4 h-full">
      {/* 메인 편집 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 문제 유형명 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-1">
            문제 유형명 *
          </label>
          <Input
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            disabled={!isEditing}
            placeholder="예: 빈칸 추론"
          />
        </div>

        {/* A4 캔버스 */}
        <div
          className="flex-1 border-2 border-border rounded-lg bg-white p-4 overflow-auto"
          style={{ minHeight: '400px' }}
        >
          {/* 지시문 */}
          <div className="border border-dashed border-border rounded p-3 mb-3 bg-muted/30">
            <label className="block text-xs text-muted-foreground mb-1">
              지시문
            </label>
            <Input
              value={formData.instruction}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, instruction: e.target.value }))
              }
              disabled={!isEditing}
              placeholder="예: 다음 빈칸에 들어갈 말로 가장 적절한 것은?"
              className="text-sm"
            />
          </div>

          {/* 데이터 유형 배치 목록 */}
          <div className="space-y-2">
            {formData.dataTypeList.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                <p className="mb-2">데이터 유형을 추가하세요</p>
                <p className="text-xs">아래 버튼을 클릭하세요</p>
              </div>
            ) : (
              formData.dataTypeList.map((item, index) => {
                const dataType = allDataTypes.find(
                  (dt) => dt.id === item.dataTypeId
                )
                const hasMissingDep =
                  dataType?.has_dependency &&
                  dataType.dependsOn.some(
                    (depId) =>
                      !formData.dataTypeList.some((i) => i.dataTypeId === depId)
                  )

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'border rounded-lg p-3',
                      hasMissingDep
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-border bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {item.dataTypeName}
                        </span>
                        {hasMissingDep && (
                          <Badge
                            variant="outline"
                            className="text-xs text-orange-600"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            의존성 필요
                          </Badge>
                        )}
                      </div>
                      {isEditing && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDataType(index, -1)}
                            disabled={index === 0}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDataType(index, 1)}
                            disabled={index === formData.dataTypeList.length - 1}
                            className="h-6 w-6 p-0"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDataType(item.id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">역할:</span>
                      <Select
                        value={item.role}
                        onValueChange={(value) =>
                          handleChangeRole(item.id, value)
                        }
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {isEditing && (
            <Button
              variant="outline"
              onClick={() => setShowDataTypeSelector(true)}
              className="w-full mt-3 border-2 border-dashed border-primary/30 text-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4 mr-2" />
              데이터 유형 추가
            </Button>
          )}
        </div>

        {/* 의존성 경고 */}
        {warnings.length > 0 && (
          <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm font-medium text-orange-700 mb-1">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              의존성 경고
            </p>
            <ul className="text-xs text-orange-600 space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-2 mt-4">
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

      {/* 데이터 유형 선택 다이얼로그 */}
      <Dialog open={showDataTypeSelector} onOpenChange={setShowDataTypeSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>데이터 유형 선택</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-auto py-4">
            {allDataTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                등록된 데이터 유형이 없습니다
              </p>
            ) : (
              allDataTypes.map((dt) => (
                <Button
                  key={dt.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddDataType(dt)}
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{dt.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {dt.target === 'passage' ? '지문' : '문장'} •{' '}
                      {dt.has_answer ? '정답有' : '자료형'}
                    </div>
                  </div>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}




