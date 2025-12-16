'use client'

// 레거시 타입 (임시 호환성)
export interface QuestionTypeItem {
  id: string
  name: string
  instruction?: string | null
  choice_layout: string
  choice_marker: string
  prompt_id?: string | null
  question_group?: string | null
}

export type QuestionTypeMode = 'prompt_based' | 'slot_based'

export interface PromptBasedFormData {
  name: string
  promptId: string
  instruction?: string
  choiceLayout: string
  choiceMarker: string
  questionGroup?: string
}

// 레거시 컴포넌트 placeholder
export function QuestionTypeFormNew(props: {
  questionType: QuestionTypeItem | null
  allDataTypes: unknown[]
  allPrompts: unknown[]
  isEditing: boolean
  onSave: (data: unknown) => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
  onCancel: () => void
}) {
  return (
    <div className="p-6 text-center text-muted-foreground">
      <p>레거시 폼 (사용 중단됨)</p>
      <p className="text-sm mt-2">새로운 4단계 위자드를 사용해주세요.</p>
    </div>
  )
}

export function QuestionTypeModeSelector(props: {
  onSelect: (mode: QuestionTypeMode) => void
  onCancel: () => void
}) {
  return (
    <div className="p-6 text-center text-muted-foreground">
      <p>모드 선택 (사용 중단됨)</p>
    </div>
  )
}

export function QuestionTypeGroupManager(props: {
  selectedId: string | null
  onSelect: (item: { id: string }) => void
  onAdd: () => void
  refreshTrigger?: number
}) {
  return (
    <div className="p-4 text-center text-muted-foreground text-sm">
      <p>그룹 관리 (사용 중단됨)</p>
    </div>
  )
}

export function PromptBasedForm(props: {
  existingData: unknown
  allPrompts: unknown[]
  isEditing: boolean
  onSave: (data: PromptBasedFormData) => Promise<void>
  onDelete?: () => Promise<void>
  onEdit?: () => void
  onCancel: () => void
  onBack?: () => void
}) {
  return (
    <div className="p-6 text-center text-muted-foreground">
      <p>프롬프트 기반 폼 (사용 중단됨)</p>
    </div>
  )
}








