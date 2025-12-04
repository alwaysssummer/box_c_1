'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FolderPlus, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GroupWithTextbooks, TreeNode } from '@/types'

interface GroupListProps {
  groups: GroupWithTextbooks[]
  isLoading: boolean
  selectedGroupId: string | null
  onSelectGroup: (group: GroupWithTextbooks) => void
  onCreateGroup: (name: string) => Promise<void>
  onDeleteGroup: (id: string) => Promise<void>
}

export function GroupList({
  groups,
  isLoading,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
}: GroupListProps) {
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreateGroup = async () => {
    console.log('GroupList handleCreateGroup called, newGroupName:', newGroupName)
    if (!newGroupName.trim() || isCreating) {
      console.log('Early return - empty name or already creating')
      return
    }
    
    setIsCreating(true)
    try {
      console.log('Calling onCreateGroup with:', newGroupName.trim())
      await onCreateGroup(newGroupName.trim())
      setNewGroupName('')
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateGroup()
    }
  }

  const handleDeleteGroup = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (deletingId) return
    
    if (confirm('이 그룹과 하위 모든 교재가 삭제됩니다. 계속하시겠습니까?')) {
      setDeletingId(id)
      try {
        await onDeleteGroup(id)
      } finally {
        setDeletingId(null)
      }
    }
  }

  return (
    <div>
      {/* 그룹 추가 입력 */}
      <div className="flex gap-2 mb-3">
        <Input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="그룹명 입력"
          className="flex-1 h-9 text-sm"
          disabled={isCreating}
        />
        <Button
          size="sm"
          className="h-9"
          onClick={handleCreateGroup}
          disabled={!newGroupName.trim() || isCreating}
        >
          {isCreating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            '등록'
          )}
        </Button>
      </div>

      {/* 그룹 목록 */}
      <div className="border border-border rounded-md bg-muted/50">
        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-6 h-6 mx-auto text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">로딩 중...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center">
            <FolderPlus className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              등록된 그룹이 없습니다
            </p>
          </div>
        ) : (
          <div className="py-1">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className={cn(
                  'flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group',
                  selectedGroupId === group.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-blue-600">📁</span>
                  <span className="text-sm font-medium truncate">{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.textbooks?.length || 0})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteGroup(group.id, e)}
                  disabled={deletingId === group.id}
                >
                  {deletingId === group.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 text-destructive" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

