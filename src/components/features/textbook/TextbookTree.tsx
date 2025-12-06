'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, Book, FileText, File, Trash2, Pencil, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreeNode, TreeNodeType } from '@/types'
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

// 현황 배지 정보
interface StatusInfo {
  completed: number
  total: number
}

interface TextbookTreeProps {
  nodes: TreeNode[]
  selectedId: string | null
  onSelect: (node: TreeNode, parentGroup?: TreeNode, parentTextbook?: TreeNode, parentUnit?: TreeNode) => void
  expandedIds?: Set<string>
  onToggleExpand?: (id: string) => void
  onDelete?: (node: TreeNode) => void
  onRename?: (node: TreeNode, newName: string) => Promise<void>
  onReorderGroups?: (groups: { id: string; order_index: number }[]) => Promise<void>
  onReorderTextbooks?: (groupId: string, textbooks: { id: string; order_index: number }[]) => Promise<void>
  onReorderUnits?: (textbookId: string, units: { id: string; order_index: number }[]) => Promise<void>
  // 선택 모드: 'textbook' = 교재 단위 선택 (문제관리), 'passage' = 지문 단위 선택 (문제출제)
  selectionMode?: 'textbook' | 'passage'
  selectedTextbookIds?: string[]
  selectedPassageIds?: string[]
  onToggleTextbookSelection?: (textbookId: string) => void
  onToggleGroupSelection?: (groupId: string, textbookIds: string[]) => void
  // 지문 단위 선택용 콜백
  onTogglePassageSelection?: (passageId: string) => void
  onToggleUnitSelection?: (unitId: string, passageIds: string[]) => void
  onToggleTextbookPassageSelection?: (textbookId: string, passageIds: string[]) => void
  onToggleGroupPassageSelection?: (groupId: string, passageIds: string[]) => void
  // 현황 배지 표시용
  statusInfo?: Map<string, StatusInfo>
}

const NODE_ICONS: Record<TreeNodeType, React.ReactNode> = {
  group: <Folder className="w-4 h-4 text-blue-600" />,
  textbook: <Book className="w-4 h-4 text-green-600" />,
  unit: <FileText className="w-4 h-4 text-orange-500" />,
  passage: <File className="w-4 h-4 text-purple-600" />,
}

const NODE_LABELS: Record<TreeNodeType, string> = {
  group: '그룹',
  textbook: '교재',
  unit: '단원',
  passage: '지문',
}

interface TreeNodeItemProps {
  node: TreeNode
  depth: number
  selectedId: string | null
  expandedIds: Set<string>
  onSelect: (node: TreeNode, parentGroup?: TreeNode, parentTextbook?: TreeNode, parentUnit?: TreeNode) => void
  onToggleExpand: (id: string) => void
  onDelete?: (node: TreeNode) => void
  onRename?: (node: TreeNode, newName: string) => Promise<void>
  parentGroup?: TreeNode
  parentTextbook?: TreeNode
  parentUnit?: TreeNode
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
  showDragHandle?: boolean
  skipChildrenRendering?: boolean // 외부에서 자식을 렌더링할 때 true
  // 선택 모드: 'textbook' = 교재 단위 선택 (문제관리), 'passage' = 지문 단위 선택 (문제출제)
  selectionMode?: 'textbook' | 'passage'
  selectedTextbookIds?: string[]
  selectedPassageIds?: string[]
  onToggleTextbookSelection?: (textbookId: string) => void
  onToggleGroupSelection?: (groupId: string, textbookIds: string[]) => void
  // 지문 단위 선택용 콜백
  onTogglePassageSelection?: (passageId: string) => void
  onToggleUnitSelection?: (unitId: string, passageIds: string[]) => void
  onToggleTextbookPassageSelection?: (textbookId: string, passageIds: string[]) => void
  onToggleGroupPassageSelection?: (groupId: string, passageIds: string[]) => void
  // 현황 배지 표시용
  statusInfo?: Map<string, StatusInfo>
}

function TreeNodeItem({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onDelete,
  onRename,
  parentGroup,
  parentTextbook,
  parentUnit,
  dragHandleProps,
  isDragging,
  showDragHandle,
  skipChildrenRendering,
  selectionMode,
  selectedTextbookIds,
  selectedPassageIds,
  onToggleTextbookSelection,
  onToggleGroupSelection,
  onTogglePassageSelection,
  onToggleUnitSelection,
  onToggleTextbookPassageSelection,
  onToggleGroupPassageSelection,
  statusInfo,
}: TreeNodeItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(node.name)
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id
  
  // 교재가 선택되었는지 확인 (문제관리 모드 - textbook 선택)
  const isTextbookSelected = selectionMode === 'textbook' && node.type === 'textbook' && selectedTextbookIds?.includes(node.id)
  
  // 지문이 선택되었는지 확인 (문제출제 모드 - passage 선택)
  const isPassageSelected = selectionMode === 'passage' && node.type === 'passage' && selectedPassageIds?.includes(node.id)

  const handleClick = () => {
    if (!isEditing) {
      onSelect(node, parentGroup, parentTextbook, parentUnit)
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(node.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(node)
  }

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditName(node.name)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (editName.trim() && editName !== node.name && onRename) {
      await onRename(node, editName.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditName(node.name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // 부모 정보 업데이트
  const nextParentGroup = node.type === 'group' ? node : parentGroup
  const nextParentTextbook = node.type === 'textbook' ? node : parentTextbook
  const nextParentUnit = node.type === 'unit' ? node : parentUnit

  // 그룹, 교재, 단원 인라인 수정 가능
  const canRename = onRename && ['group', 'textbook', 'unit'].includes(node.type)

  // 드래그 핸들 표시 조건: 그룹, 교재, 단원이면서 showDragHandle이 true
  const shouldShowDragHandle = showDragHandle && dragHandleProps && (node.type === 'group' || node.type === 'textbook' || node.type === 'unit')

  // 드래그 가능한 타입인지
  const isDraggableType = node.type === 'group' || node.type === 'textbook' || node.type === 'unit'

  // ============ 하위 지문 ID 수집 헬퍼 함수 ============
  const collectPassageIds = (treeNode: TreeNode): string[] => {
    if (treeNode.type === 'passage') return [treeNode.id]
    if (!treeNode.children) return []
    return treeNode.children.flatMap(child => collectPassageIds(child))
  }

  // ============ 교재 선택 토글 핸들러 (문제관리 모드) ============
  const handleTextbookToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'textbook' && onToggleTextbookSelection) {
      onToggleTextbookSelection(node.id)
    }
  }

  // 그룹 선택 토글 핸들러 - 문제관리 모드 (하위 교재 전체 선택/해제)
  const handleGroupToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'group' && onToggleGroupSelection && node.children) {
      const textbookIds = node.children
        .filter(child => child.type === 'textbook')
        .map(child => child.id)
      onToggleGroupSelection(node.id, textbookIds)
    }
  }

  // ============ 지문 단위 선택 핸들러들 (문제출제 모드) ============
  // 지문 선택 토글 핸들러
  const handlePassageToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'passage' && onTogglePassageSelection) {
      onTogglePassageSelection(node.id)
    }
  }

  // 단원 선택 토글 핸들러 (하위 지문 전체 선택/해제)
  const handleUnitPassageToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'unit' && onToggleUnitSelection) {
      const passageIds = collectPassageIds(node)
      onToggleUnitSelection(node.id, passageIds)
    }
  }

  // 교재 선택 토글 핸들러 - 문제출제 모드 (하위 지문 전체 선택/해제)
  const handleTextbookPassageToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'textbook' && onToggleTextbookPassageSelection) {
      const passageIds = collectPassageIds(node)
      onToggleTextbookPassageSelection(node.id, passageIds)
    }
  }

  // 그룹 선택 토글 핸들러 - 문제출제 모드 (하위 지문 전체 선택/해제)
  const handleGroupPassageToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'group' && onToggleGroupPassageSelection) {
      const passageIds = collectPassageIds(node)
      onToggleGroupPassageSelection(node.id, passageIds)
    }
  }

  // ============ 문제관리 모드 - 교재 단위 선택 상태 계산 ============
  // 그룹 내 교재 목록
  const groupTextbooks = node.type === 'group' && node.children 
    ? node.children.filter(c => c.type === 'textbook') 
    : []

  // 그룹 내 모든 교재가 선택되었는지 확인 (교재가 있어야만 true)
  const isGroupFullySelected = selectionMode === 'textbook' && groupTextbooks.length > 0 && selectedTextbookIds
    ? groupTextbooks.every(c => selectedTextbookIds.includes(c.id))
    : false

  // 그룹 내 일부 교재가 선택되었는지 확인
  const isGroupPartiallySelected = selectionMode === 'textbook' && groupTextbooks.length > 0 && selectedTextbookIds
    ? groupTextbooks.some(c => selectedTextbookIds.includes(c.id)) && !isGroupFullySelected
    : false

  // ============ 문제출제 모드 - 지문 단위 선택 상태 계산 ============
  const nodePassageIds = collectPassageIds(node)
  
  // 노드 내 모든 지문이 선택되었는지 (지문이 있어야만 true)
  const isNodeFullySelectedByPassage = selectionMode === 'passage' && nodePassageIds.length > 0 && selectedPassageIds
    ? nodePassageIds.every(id => selectedPassageIds.includes(id))
    : false
  
  // 노드 내 일부 지문이 선택되었는지
  const isNodePartiallySelectedByPassage = selectionMode === 'passage' && nodePassageIds.length > 0 && selectedPassageIds
    ? nodePassageIds.some(id => selectedPassageIds.includes(id)) && !isNodeFullySelectedByPassage
    : false

  // 클릭 핸들러 결정
  const getClickHandler = () => {
    if (!selectionMode) return handleClick
    
    if (selectionMode === 'textbook') {
      // 문제관리 모드: 교재 단위 선택
      if (node.type === 'textbook') return handleTextbookToggle
      if (node.type === 'group') return handleGroupToggle
      return handleClick
    } else if (selectionMode === 'passage') {
      // 문제출제 모드: 지문 단위 선택
      if (node.type === 'passage') return handlePassageToggle
      if (node.type === 'unit') return handleUnitPassageToggle
      if (node.type === 'textbook') return handleTextbookPassageToggle
      if (node.type === 'group') return handleGroupPassageToggle
      return handleClick
    }
    return handleClick
  }

  // 하이라이트 스타일 결정
  const getHighlightClass = () => {
    if (isSelected) return 'bg-primary/10 text-primary'
    
    if (selectionMode === 'textbook') {
      if (isTextbookSelected) return 'bg-violet-100 text-violet-800 ring-1 ring-violet-300'
      if (isGroupFullySelected || isGroupPartiallySelected) return 'bg-blue-50 text-blue-800'
    } else if (selectionMode === 'passage') {
      if (isPassageSelected) return 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
      if (isNodeFullySelectedByPassage) return 'bg-emerald-50 text-emerald-700'
      if (isNodePartiallySelectedByPassage) return 'bg-amber-50 text-amber-700'
    }
    
    return 'hover:bg-muted'
  }

  return (
    <div style={{ opacity: isDragging ? 0.5 : 1 }}>
      <div
        onClick={getClickHandler()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'flex items-center py-1.5 px-2 rounded cursor-pointer transition-colors group',
          getHighlightClass()
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* ============ 문제관리 모드 - 교재 단위 체크박스 ============ */}
        {/* 그룹 체크박스 */}
        {selectionMode === 'textbook' && node.type === 'group' && (
          <div 
            className="w-4 h-4 mr-2 flex items-center justify-center"
            onClick={handleGroupToggle}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors',
              isGroupFullySelected
                ? 'bg-blue-600 border-blue-600'
                : isGroupPartiallySelected
                  ? 'bg-blue-300 border-blue-400'
                  : 'border-gray-300 hover:border-blue-400'
            )}>
              {isGroupFullySelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isGroupPartiallySelected && (
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-sm" />
              )}
            </div>
          </div>
        )}
        {/* 교재 체크박스 */}
        {selectionMode === 'textbook' && node.type === 'textbook' && (
          <div 
            className="w-4 h-4 mr-2 flex items-center justify-center"
            onClick={handleTextbookToggle}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors',
              isTextbookSelected
                ? 'bg-violet-600 border-violet-600'
                : 'border-gray-300 hover:border-violet-400'
            )}>
              {isTextbookSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* ============ 문제출제 모드 - 지문 단위 체크박스 ============ */}
        {/* 그룹 체크박스 (지문 모드) */}
        {selectionMode === 'passage' && node.type === 'group' && (
          <div 
            className="w-4 h-4 mr-2 flex items-center justify-center"
            onClick={handleGroupPassageToggle}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors',
              isNodeFullySelectedByPassage
                ? 'bg-emerald-600 border-emerald-600'
                : isNodePartiallySelectedByPassage
                  ? 'bg-amber-400 border-amber-500'
                  : 'border-gray-300 hover:border-emerald-400'
            )}>
              {isNodeFullySelectedByPassage && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isNodePartiallySelectedByPassage && (
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-sm" />
              )}
            </div>
          </div>
        )}
        {/* 교재 체크박스 (지문 모드) */}
        {selectionMode === 'passage' && node.type === 'textbook' && (
          <div 
            className="w-4 h-4 mr-2 flex items-center justify-center"
            onClick={handleTextbookPassageToggle}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors',
              isNodeFullySelectedByPassage
                ? 'bg-emerald-600 border-emerald-600'
                : isNodePartiallySelectedByPassage
                  ? 'bg-amber-400 border-amber-500'
                  : 'border-gray-300 hover:border-emerald-400'
            )}>
              {isNodeFullySelectedByPassage && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isNodePartiallySelectedByPassage && (
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-sm" />
              )}
            </div>
          </div>
        )}
        {/* 단원 체크박스 (지문 모드) */}
        {selectionMode === 'passage' && node.type === 'unit' && (
          <div 
            className="w-4 h-4 mr-2 flex items-center justify-center"
            onClick={handleUnitPassageToggle}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors',
              isNodeFullySelectedByPassage
                ? 'bg-emerald-600 border-emerald-600'
                : isNodePartiallySelectedByPassage
                  ? 'bg-amber-400 border-amber-500'
                  : 'border-gray-300 hover:border-emerald-400'
            )}>
              {isNodeFullySelectedByPassage && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isNodePartiallySelectedByPassage && (
                <div className="w-1.5 h-1.5 bg-amber-600 rounded-sm" />
              )}
            </div>
          </div>
        )}
        {/* 지문 체크박스 (지문 모드) */}
        {selectionMode === 'passage' && node.type === 'passage' && (
          <div 
            className="w-4 h-4 mr-2 flex items-center justify-center"
            onClick={handlePassageToggle}
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors',
              isPassageSelected
                ? 'bg-emerald-600 border-emerald-600'
                : 'border-gray-300 hover:border-emerald-400'
            )}>
              {isPassageSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
        
        {/* 드래그 핸들 (그룹, 교재, 단원) - 선택 모드가 아닐 때만 */}
        {!selectionMode && shouldShowDragHandle ? (
          <button
            {...dragHandleProps}
            className="w-4 h-4 mr-1 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </button>
        ) : !selectionMode && (
          // 드래그 핸들이 없는 경우 공간 유지 (드래그 가능한 타입만)
          isDraggableType && <span className="w-4 h-4 mr-1" />
        )}

        {/* 확장/축소 버튼 */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-4 h-4 mr-1 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        ) : (
          <span className="w-4 h-4 mr-1" />
        )}

        {/* 아이콘 */}
        <span className="mr-1.5">{NODE_ICONS[node.type]}</span>

        {/* 이름 (편집 모드) */}
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="text-sm flex-1 px-1 py-0.5 border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
        ) : (
          <span className="text-sm truncate flex-1">{node.name}</span>
        )}

        {/* 타입 라벨 */}
        {!isEditing && (
          <span className="text-xs text-muted-foreground ml-1">
            ({NODE_LABELS[node.type]})
          </span>
        )}

        {/* 현황 배지 (그룹/교재) */}
        {!isEditing && statusInfo && (node.type === 'group' || node.type === 'textbook') && statusInfo.has(node.id) && (
          <span className={cn(
            "text-xs ml-2 px-1.5 py-0.5 rounded-full font-medium",
            statusInfo.get(node.id)!.completed === statusInfo.get(node.id)!.total
              ? "bg-green-100 text-green-700"
              : statusInfo.get(node.id)!.completed > 0
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-100 text-gray-600"
          )}>
            ✅ {statusInfo.get(node.id)!.completed}/{statusInfo.get(node.id)!.total}
          </span>
        )}

        {/* 수정/삭제 버튼 */}
        {isHovered && !isEditing && (
          <div className="flex items-center gap-1 ml-2">
            {canRename && (
              <button
                onClick={handleStartEdit}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="이름 수정"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title={`${NODE_LABELS[node.type]} 삭제`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 자식 노드 (skipChildrenRendering이 true면 외부에서 렌더링) */}
      {!skipChildrenRendering && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onDelete={onDelete}
              onRename={onRename}
              parentGroup={nextParentGroup}
              parentTextbook={nextParentTextbook}
              parentUnit={nextParentUnit}
              selectionMode={selectionMode}
              selectedTextbookIds={selectedTextbookIds}
              selectedPassageIds={selectedPassageIds}
              onToggleTextbookSelection={onToggleTextbookSelection}
              onToggleGroupSelection={onToggleGroupSelection}
              onTogglePassageSelection={onTogglePassageSelection}
              onToggleUnitSelection={onToggleUnitSelection}
              onToggleTextbookPassageSelection={onToggleTextbookPassageSelection}
              onToggleGroupPassageSelection={onToggleGroupPassageSelection}
              statusInfo={statusInfo}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 드래그 가능한 단원 아이템
function SortableUnitItem({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onDelete,
  onRename,
  parentGroup,
  parentTextbook,
}: {
  node: TreeNode
  depth: number
  selectedId: string | null
  expandedIds: Set<string>
  onSelect: (node: TreeNode, parentGroup?: TreeNode, parentTextbook?: TreeNode, parentUnit?: TreeNode) => void
  onToggleExpand: (id: string) => void
  onDelete?: (node: TreeNode) => void
  onRename?: (node: TreeNode, newName: string) => Promise<void>
  parentGroup?: TreeNode
  parentTextbook: TreeNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TreeNodeItem
        node={node}
        depth={depth}
        selectedId={selectedId}
        expandedIds={expandedIds}
        onSelect={onSelect}
        onToggleExpand={onToggleExpand}
        onDelete={onDelete}
        onRename={onRename}
        parentGroup={parentGroup}
        parentTextbook={parentTextbook}
        dragHandleProps={listeners}
        isDragging={isDragging}
        showDragHandle={true}
      />
    </div>
  )
}

// 드래그 가능한 교재 아이템 (단원 드래그 앤 드롭 포함)
function SortableTextbookItemWithUnits({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onDelete,
  onRename,
  parentGroup,
  onReorderUnits,
  sensors,
}: {
  node: TreeNode
  depth: number
  selectedId: string | null
  expandedIds: Set<string>
  onSelect: (node: TreeNode, parentGroup?: TreeNode, parentTextbook?: TreeNode, parentUnit?: TreeNode) => void
  onToggleExpand: (id: string) => void
  onDelete?: (node: TreeNode) => void
  onRename?: (node: TreeNode, newName: string) => Promise<void>
  parentGroup: TreeNode
  onReorderUnits?: (textbookId: string, units: { id: string; order_index: number }[]) => Promise<void>
  sensors: ReturnType<typeof useSensors>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isExpanded = expandedIds.has(node.id)
  const hasUnits = node.children && node.children.length > 0 && node.children[0]?.type === 'unit'
  const unitIds = hasUnits ? node.children!.map((child) => child.id) : []

  // 단원 드래그 종료 핸들러
  const handleUnitDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && node.children) {
      const oldIndex = node.children.findIndex((child) => child.id === active.id)
      const newIndex = node.children.findIndex((child) => child.id === over.id)
      
      const reorderedUnits = arrayMove(node.children, oldIndex, newIndex).map((child, index) => ({
        id: child.id,
        order_index: index,
      }))

      if (onReorderUnits) {
        await onReorderUnits(node.id, reorderedUnits)
      }
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* 교재 노드 자체 */}
      <TreeNodeItem
        node={node}
        depth={depth}
        selectedId={selectedId}
        expandedIds={expandedIds}
        onSelect={onSelect}
        onToggleExpand={onToggleExpand}
        onDelete={onDelete}
        onRename={onRename}
        parentGroup={parentGroup}
        dragHandleProps={listeners}
        isDragging={isDragging}
        showDragHandle={true}
        skipChildrenRendering={true}
      />

      {/* 확장된 자식 노드 (단원) - 별도 DndContext */}
      {isExpanded && hasUnits && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleUnitDragEnd}
        >
          <SortableContext
            items={unitIds}
            strategy={verticalListSortingStrategy}
          >
            {node.children!.map((child) => (
              <SortableUnitItem
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                onRename={onRename}
                parentGroup={parentGroup}
                parentTextbook={node}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// 드래그 가능한 그룹 아이템 (교재, 단원 드래그 앤 드롭 포함)
function SortableGroupItemWithTextbooks({
  node,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onDelete,
  onRename,
  onReorderTextbooks,
  onReorderUnits,
  sensors,
}: {
  node: TreeNode
  selectedId: string | null
  expandedIds: Set<string>
  onSelect: (node: TreeNode, parentGroup?: TreeNode, parentTextbook?: TreeNode, parentUnit?: TreeNode) => void
  onToggleExpand: (id: string) => void
  onDelete?: (node: TreeNode) => void
  onRename?: (node: TreeNode, newName: string) => Promise<void>
  onReorderTextbooks?: (groupId: string, textbooks: { id: string; order_index: number }[]) => Promise<void>
  onReorderUnits?: (textbookId: string, units: { id: string; order_index: number }[]) => Promise<void>
  sensors: ReturnType<typeof useSensors>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isExpanded = expandedIds.has(node.id)
  const hasTextbooks = node.children && node.children.length > 0 && node.children[0]?.type === 'textbook'
  const textbookIds = hasTextbooks ? node.children!.map((child) => child.id) : []

  // 교재 드래그 종료 핸들러
  const handleTextbookDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && node.children) {
      const oldIndex = node.children.findIndex((child) => child.id === active.id)
      const newIndex = node.children.findIndex((child) => child.id === over.id)
      
      const reorderedTextbooks = arrayMove(node.children, oldIndex, newIndex).map((child, index) => ({
        id: child.id,
        order_index: index,
      }))

      if (onReorderTextbooks) {
        await onReorderTextbooks(node.id, reorderedTextbooks)
      }
    }
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* 그룹 노드 자체 */}
      <TreeNodeItem
        node={node}
        depth={0}
        selectedId={selectedId}
        expandedIds={expandedIds}
        onSelect={onSelect}
        onToggleExpand={onToggleExpand}
        onDelete={onDelete}
        onRename={onRename}
        dragHandleProps={listeners}
        isDragging={isDragging}
        showDragHandle={true}
        skipChildrenRendering={true}
      />

      {/* 확장된 자식 노드 (교재) - 별도 DndContext */}
      {isExpanded && hasTextbooks && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTextbookDragEnd}
        >
          <SortableContext
            items={textbookIds}
            strategy={verticalListSortingStrategy}
          >
            {node.children!.map((child) => (
              <SortableTextbookItemWithUnits
                key={child.id}
                node={child}
                depth={1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                onRename={onRename}
                parentGroup={node}
                onReorderUnits={onReorderUnits}
                sensors={sensors}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

export function TextbookTree({
  nodes,
  selectedId,
  onSelect,
  expandedIds: controlledExpandedIds,
  onToggleExpand: controlledOnToggleExpand,
  onDelete,
  onRename,
  onReorderGroups,
  onReorderTextbooks,
  onReorderUnits,
  selectionMode,
  selectedTextbookIds,
  selectedPassageIds,
  onToggleTextbookSelection,
  onToggleGroupSelection,
  onTogglePassageSelection,
  onToggleUnitSelection,
  onToggleTextbookPassageSelection,
  onToggleGroupPassageSelection,
  statusInfo,
}: TextbookTreeProps) {
  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(new Set())

  const expandedIds = controlledExpandedIds ?? internalExpandedIds
  const handleToggleExpand = controlledOnToggleExpand ?? ((id: string) => {
    setInternalExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  })

  // 드래그 앤 드롭 센서
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 그룹 ID 목록
  const groupIds = nodes.map((node) => node.id)

  // 그룹 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = nodes.findIndex((node) => node.id === active.id)
      const newIndex = nodes.findIndex((node) => node.id === over.id)
      
      const reorderedGroups = arrayMove(nodes, oldIndex, newIndex).map((node, index) => ({
        id: node.id,
        order_index: index,
      }))

      if (onReorderGroups) {
        await onReorderGroups(reorderedGroups)
      }
    }
  }

  if (nodes.length === 0) {
    return null
  }

  // 선택 모드 또는 현황 배지 표시 모드에서는 드래그 앤 드롭 없이 간단한 렌더링 (우선 처리)
  if (selectionMode || statusInfo) {
    return (
      <div className="py-1">
        {nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onToggleExpand={handleToggleExpand}
            onDelete={onDelete}
            onRename={onRename}
            selectionMode={selectionMode}
            selectedTextbookIds={selectedTextbookIds}
            selectedPassageIds={selectedPassageIds}
            onToggleTextbookSelection={onToggleTextbookSelection}
            onToggleGroupSelection={onToggleGroupSelection}
            onTogglePassageSelection={onTogglePassageSelection}
            onToggleUnitSelection={onToggleUnitSelection}
            onToggleTextbookPassageSelection={onToggleTextbookPassageSelection}
            onToggleGroupPassageSelection={onToggleGroupPassageSelection}
            statusInfo={statusInfo}
          />
        ))}
      </div>
    )
  }

  // 드래그 앤 드롭 활성화 (그룹, 교재, 단원) - 문장분리 모드
  if (onReorderGroups || onReorderTextbooks || onReorderUnits) {
    return (
      <div className="py-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={groupIds}
            strategy={verticalListSortingStrategy}
          >
            {nodes.map((node) => (
              <SortableGroupItemWithTextbooks
                key={node.id}
                node={node}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={handleToggleExpand}
                onDelete={onDelete}
                onRename={onRename}
                onReorderTextbooks={onReorderTextbooks}
                onReorderUnits={onReorderUnits}
                sensors={sensors}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    )
  }

  // 기본 렌더링
  return (
    <div className="py-1">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onToggleExpand={handleToggleExpand}
          onDelete={onDelete}
          onRename={onRename}
          statusInfo={statusInfo}
        />
      ))}
    </div>
  )
}
