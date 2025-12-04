'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Book, Folder, FileText, Trash2, ArrowRightLeft, Loader2, GripVertical, Check, X, Pencil } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TreeNode, GroupWithTextbooks } from '@/types'
import { toast } from 'sonner'

interface TextbookDetailProps {
  textbook: TreeNode & { parentGroupId?: string; parentGroupName?: string }
  groups: GroupWithTextbooks[]
  onMove: (targetGroupId: string) => Promise<void>
  onDelete: () => Promise<void>
  onUnitUpdate?: () => void // 단원 변경 후 콜백
}

// 드래그 가능한 단원 아이템
function SortableUnit({
  unit,
  isEditing,
  editValue,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditValueChange,
  isSaving,
}: {
  unit: TreeNode
  isEditing: boolean
  editValue: string
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onEditValueChange: (value: string) => void
  isSaving: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: unit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`text-sm text-foreground py-1.5 px-2 bg-muted/50 rounded flex items-center gap-2 group ${
        isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''
      }`}
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        title="드래그하여 순서 변경"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* 단원명 (편집 모드 또는 보기 모드) */}
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={onSaveEdit}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={onCancelEdit}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <span
            className="flex-1 cursor-pointer hover:text-primary"
            onDoubleClick={onStartEdit}
            title="더블클릭하여 이름 수정"
          >
            {unit.name}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onStartEdit}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </>
      )}

      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {unit.children?.length || 0}개 지문
      </span>
    </div>
  )
}

export function TextbookDetail({
  textbook,
  groups,
  onMove,
  onDelete,
  onUnitUpdate,
}: TextbookDetailProps) {
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 단원 순서 관리
  const [units, setUnits] = useState<TreeNode[]>(textbook.children || [])
  const [isReordering, setIsReordering] = useState(false)

  // textbook.id가 변경될 때만 units state 동기화 (다른 교재 선택 시)
  // 같은 교재 내에서 순서 변경 시에는 로컬 state 유지
  useEffect(() => {
    // 새 교재가 선택된 경우에만 동기화
    if (textbook.children && textbook.children.length > 0) {
      // 현재 units와 textbook.children의 ID 목록 비교
      const currentIds = units.map(u => u.id).sort().join(',')
      const newIds = textbook.children.map(u => u.id).sort().join(',')
      
      // ID 목록이 다르면 (다른 교재 선택) 완전히 교체
      if (currentIds !== newIds) {
        setUnits(textbook.children)
      }
      // ID 목록이 같으면 (같은 교재, 순서만 변경) 이름 등 업데이트만
      else {
        setUnits(prev => prev.map(unit => {
          const updated = textbook.children?.find(u => u.id === unit.id)
          return updated ? { ...unit, name: updated.name, children: updated.children } : unit
        }))
      }
    }
  }, [textbook.id, textbook.children])

  // 인라인 편집 상태
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const unitCount = units.length
  const passageCount = units.reduce(
    (sum, unit) => sum + (unit.children?.length || 0),
    0
  )

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = units.findIndex((u) => u.id === active.id)
      const newIndex = units.findIndex((u) => u.id === over.id)

      const newUnits = arrayMove(units, oldIndex, newIndex)
      setUnits(newUnits)

      // API 호출
      setIsReordering(true)
      try {
        const response = await fetch('/api/units/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            units: newUnits.map((u, i) => ({ id: u.id, order_index: i })),
          }),
        })

        if (!response.ok) throw new Error('Failed to reorder')
        toast.success('순서가 변경되었습니다')
        onUnitUpdate?.()
      } catch {
        // 실패 시 원래대로 복구
        setUnits(textbook.children || [])
        toast.error('순서 변경에 실패했습니다')
      } finally {
        setIsReordering(false)
      }
    }
  }

  // 인라인 편집 시작
  const handleStartEdit = (unit: TreeNode) => {
    setEditingUnitId(unit.id)
    setEditValue(unit.name)
  }

  // 인라인 편집 취소
  const handleCancelEdit = () => {
    setEditingUnitId(null)
    setEditValue('')
  }

  // 인라인 편집 저장
  const handleSaveEdit = async () => {
    if (!editingUnitId || !editValue.trim()) return

    setIsSavingName(true)
    try {
      const response = await fetch(`/api/units/${editingUnitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue.trim() }),
      })

      if (!response.ok) throw new Error('Failed to update')

      // 로컬 상태 업데이트
      setUnits((prev) =>
        prev.map((u) =>
          u.id === editingUnitId ? { ...u, name: editValue.trim() } : u
        )
      )
      toast.success('단원명이 변경되었습니다')
      onUnitUpdate?.()
    } catch {
      toast.error('단원명 변경에 실패했습니다')
    } finally {
      setIsSavingName(false)
      setEditingUnitId(null)
      setEditValue('')
    }
  }

  const handleMove = async (targetGroupId: string) => {
    if (isMoving) return

    setIsMoving(true)
    try {
      await onMove(targetGroupId)
      setShowMoveModal(false)
    } finally {
      setIsMoving(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return

    if (confirm(`"${textbook.name}" 교재를 삭제하시겠습니까?\n모든 단원과 지문이 함께 삭제됩니다.`)) {
      setIsDeleting(true)
      try {
        await onDelete()
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const availableGroups = groups.filter(
    (g) => g.id !== textbook.parentGroupId
  )

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Book className="w-8 h-8 text-green-600" />
        <h3 className="text-xl font-semibold">{textbook.name}</h3>
      </div>

      {/* 기본 정보 */}
      <div className="border border-border rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">교재 정보</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-600" />
            <span className="text-muted-foreground w-20">소속 그룹:</span>
            <span className="font-medium">{textbook.parentGroupName}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-500" />
            <span className="text-muted-foreground w-20">단원 수:</span>
            <span className="font-medium">{unitCount}개</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <span className="text-muted-foreground w-20">지문 수:</span>
            <span className="font-medium">{passageCount}개</span>
          </div>
        </div>
      </div>

      {/* 단원 목록 (드래그 가능) */}
      {units.length > 0 && (
        <div className="border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-muted-foreground">단원 목록</h4>
            <span className="text-xs text-muted-foreground">
              드래그하여 순서 변경 • 더블클릭하여 이름 수정
            </span>
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={units.map((u) => u.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={`space-y-1 max-h-60 overflow-auto ${isReordering ? 'opacity-50 pointer-events-none' : ''}`}>
                {units.map((unit) => (
                  <SortableUnit
                    key={unit.id}
                    unit={unit}
                    isEditing={editingUnitId === unit.id}
                    editValue={editValue}
                    onStartEdit={() => handleStartEdit(unit)}
                    onCancelEdit={handleCancelEdit}
                    onSaveEdit={handleSaveEdit}
                    onEditValueChange={setEditValue}
                    isSaving={isSavingName}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button
          onClick={() => setShowMoveModal(true)}
          className="flex-1"
          variant="outline"
          disabled={availableGroups.length === 0}
        >
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          그룹 이동
        </Button>
        <Button
          onClick={handleDelete}
          className="flex-1"
          variant="destructive"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          삭제
        </Button>
      </div>

      {/* 그룹 이동 모달 */}
      <Dialog open={showMoveModal} onOpenChange={setShowMoveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>그룹 이동</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              "{textbook.name}" 교재를 이동할 그룹을 선택하세요.
            </p>
            <div className="space-y-2 max-h-60 overflow-auto">
              {availableGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  이동 가능한 그룹이 없습니다
                </p>
              ) : (
                availableGroups.map((group) => (
                  <Button
                    key={group.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleMove(group.id)}
                    disabled={isMoving}
                  >
                    {isMoving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Folder className="w-4 h-4 text-blue-600 mr-2" />
                    )}
                    {group.name}
                  </Button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
