'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, Book, FileText, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreeNode, TreeNodeType } from '@/types'

interface TextbookTreeProps {
  nodes: TreeNode[]
  selectedId: string | null
  onSelect: (node: TreeNode, parentGroup?: TreeNode) => void
  expandedIds?: Set<string>
  onToggleExpand?: (id: string) => void
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
  onSelect: (node: TreeNode, parentGroup?: TreeNode) => void
  onToggleExpand: (id: string) => void
  parentGroup?: TreeNode
}

function TreeNodeItem({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  parentGroup,
}: TreeNodeItemProps) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  const handleClick = () => {
    onSelect(node, parentGroup)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(node.id)
  }

  // 현재 노드가 그룹이면 자식에게 전달할 parentGroup 업데이트
  const nextParentGroup = node.type === 'group' ? node : parentGroup

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center py-1.5 px-2 rounded cursor-pointer transition-colors',
          isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
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

        {/* 이름 */}
        <span className="text-sm truncate">{node.name}</span>

        {/* 타입 라벨 */}
        <span className="text-xs text-muted-foreground ml-1">
          ({NODE_LABELS[node.type]})
        </span>
      </div>

      {/* 자식 노드 */}
      {isExpanded && hasChildren && (
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
              parentGroup={nextParentGroup}
            />
          ))}
        </div>
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

  if (nodes.length === 0) {
    return null
  }

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
        />
      ))}
    </div>
  )
}




