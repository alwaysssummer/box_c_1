'use client'

import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent, type ContentMode } from '@/components/layout/MainContent'
import { RightPanel } from '@/components/layout/RightPanel'
import { TextbookTree, SheetSelector, SplitDetailPanel, TextbookDetail, PassageDetail } from '@/components/features/textbook'
import { SheetImportProvider } from '@/contexts/SheetImportContext'
import { DataGenerateProvider } from '@/contexts/DataGenerateContext'
import { DataGenerator, DataGeneratePanel } from '@/components/features/data-generate'
import { PromptList, PromptForm } from '@/components/features/prompt'
import { DataTypeList, DataTypeForm, type DataTypeItem } from '@/components/features/data-type'
import { QuestionTypeList, QuestionTypeForm, type QuestionTypeItem } from '@/components/features/question-type'
import { ActiveTab, SettingMenu, TreeNode, GroupWithTextbooks, CHOICE_LAYOUTS, CHOICE_MARKERS, type ModelId, SENTENCE_SPLIT_MODELS } from '@/types'
import type { Prompt } from '@/types/database'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FolderTree, Settings, Users, Sparkles, Database } from 'lucide-react'
import { convertToTreeNodes } from '@/lib/tree-utils'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('교재관리')
  const [settingMenu, setSettingMenu] = useState<SettingMenu>('데이터 유형')
  
  // 교재관리 서브 모드 (문장분리, 데이터 생성, 문제 생성)
  const [contentMode, setContentMode] = useState<ContentMode>('문장분리')
  
  // 교재관리 상태
  const [groups, setGroups] = useState<GroupWithTextbooks[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<GroupWithTextbooks | null>(null)
  const [selectedTextbook, setSelectedTextbook] = useState<(TreeNode & { parentGroupId?: string; parentGroupName?: string }) | null>(null)
  const [selectedPassage, setSelectedPassage] = useState<{
    id: string
    name: string
    unitName: string
    textbookName: string
  } | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // 데이터 유형 상태
  const [dataTypes, setDataTypes] = useState<DataTypeItem[]>([])
  const [isLoadingDataTypes, setIsLoadingDataTypes] = useState(true)
  const [selectedDataType, setSelectedDataType] = useState<DataTypeItem | null>(null)
  const [isEditingDataType, setIsEditingDataType] = useState(false)

  // 문제 유형 상태
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeItem[]>([])
  const [isLoadingQuestionTypes, setIsLoadingQuestionTypes] = useState(true)
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionTypeItem | null>(null)
  const [isEditingQuestionType, setIsEditingQuestionType] = useState(false)
  const [choiceLayout, setChoiceLayout] = useState('vertical')
  const [choiceMarker, setChoiceMarker] = useState('circle')

  // 프롬프트 상태
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)

  // ============ 교재관리 함수들 ============

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true)
      const response = await fetch('/api/groups')
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()
      
      if (Array.isArray(data) && data.length > 0) {
        const groupsWithTextbooks = await Promise.all(
          data.map(async (group: { id: string; name: string }) => {
            const textbooksRes = await fetch(`/api/textbooks?groupId=${group.id}`)
            const textbooks = textbooksRes.ok ? await textbooksRes.json() : []
            return { ...group, textbooks }
          })
        )
        setGroups(groupsWithTextbooks)
      }
      // Supabase 미연결 시 groups는 빈 배열 유지 (로컬에서 추가 가능)
    } catch (error) {
      console.error('Error fetching groups:', error)
      // API 실패해도 로컬 상태로 동작 가능
    } finally {
      setIsLoadingGroups(false)
    }
  }, [])

  // ============ 데이터 유형 함수들 ============

  const fetchDataTypes = useCallback(async () => {
    try {
      setIsLoadingDataTypes(true)
      const response = await fetch('/api/data-types')
      if (!response.ok) throw new Error('Failed to fetch data types')
      const data = await response.json()
      setDataTypes(data)
    } catch (error) {
      console.error('Error fetching data types:', error)
    } finally {
      setIsLoadingDataTypes(false)
    }
  }, [])

  const handleSaveDataType = async (formData: {
    id: string | null
    name: string
    target: string
    prompt: string
    outputSchema: string
    sampleResult: string
    hasAnswer: boolean
    answerFormat: string
    hasDependency: boolean
    dependsOn: string[]
  }) => {
    const url = formData.id ? `/api/data-types/${formData.id}` : '/api/data-types'
    const method = formData.id ? 'PATCH' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!response.ok) throw new Error('Failed to save data type')
    
    await fetchDataTypes()
    setSelectedDataType(null)
    setIsEditingDataType(false)
  }

  const handleDeleteDataType = async () => {
    if (!selectedDataType) return

    const response = await fetch(`/api/data-types/${selectedDataType.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) throw new Error('Failed to delete data type')
    
    await fetchDataTypes()
    setSelectedDataType(null)
    setIsEditingDataType(false)
  }

  // ============ 문제 유형 함수들 ============

  const fetchQuestionTypes = useCallback(async () => {
    try {
      setIsLoadingQuestionTypes(true)
      const response = await fetch('/api/question-types')
      if (!response.ok) throw new Error('Failed to fetch question types')
      const data = await response.json()
      setQuestionTypes(data)
    } catch (error) {
      console.error('Error fetching question types:', error)
    } finally {
      setIsLoadingQuestionTypes(false)
    }
  }, [])

  const handleSaveQuestionType = async (formData: {
    id: string | null
    name: string
    instruction: string
    dataTypeList: { dataTypeId: string; role: string }[]
    choiceLayout: string
    choiceMarker: string
  }) => {
    const url = formData.id ? `/api/question-types/${formData.id}` : '/api/question-types'
    const method = formData.id ? 'PATCH' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!response.ok) throw new Error('Failed to save question type')
    
    await fetchQuestionTypes()
    setSelectedQuestionType(null)
    setIsEditingQuestionType(false)
  }

  const handleDeleteQuestionType = async () => {
    if (!selectedQuestionType) return

    const response = await fetch(`/api/question-types/${selectedQuestionType.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) throw new Error('Failed to delete question type')
    
    await fetchQuestionTypes()
    setSelectedQuestionType(null)
    setIsEditingQuestionType(false)
  }

  // ============ 프롬프트 함수들 ============

  const fetchPrompts = useCallback(async () => {
    try {
      setIsLoadingPrompts(true)
      const response = await fetch('/api/prompts')
      if (!response.ok) throw new Error('Failed to fetch prompts')
      const data = await response.json()
      setPrompts(data)
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setIsLoadingPrompts(false)
    }
  }, [])

  const handleSavePrompt = async (formData: {
    id: string | null
    name: string
    description: string
    category: string
    target: 'passage' | 'sentence'
    content: string
    variables: string[]
    outputSchema: string
    sampleInput: string
    sampleOutput: string
    testPassageId: string | null
    preferredModel: ModelId
    status: 'draft' | 'testing' | 'confirmed'
  }) => {
    const url = formData.id ? `/api/prompts/${formData.id}` : '/api/prompts'
    const method = formData.id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!response.ok) throw new Error('Failed to save prompt')
    
    await fetchPrompts()
    setSelectedPrompt(null)
    setIsEditingPrompt(false)
  }

  const handleDeletePrompt = async () => {
    if (!selectedPrompt) return

    const response = await fetch(`/api/prompts/${selectedPrompt.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) throw new Error('Failed to delete prompt')
    
    await fetchPrompts()
    setSelectedPrompt(null)
    setIsEditingPrompt(false)
  }

  // ============ 초기 로드 ============

  useEffect(() => {
    fetchGroups()
    fetchDataTypes()
    fetchQuestionTypes()
    fetchPrompts()
  }, [fetchGroups, fetchDataTypes, fetchQuestionTypes, fetchPrompts])

  // ============ 교재관리 헬퍼 함수들 ============

  const handleCreateGroup = async (name: string) => {
    console.log('handleCreateGroup called:', name)
    // Supabase 미연결 시에도 로컬 상태로 바로 처리
    const tempGroup = { id: `temp-${Date.now()}`, name, textbooks: [] }
    console.log('Creating temp group:', tempGroup)
    setGroups((prev) => {
      console.log('Previous groups:', prev)
      return [...prev, tempGroup]
    })
    
    // 백그라운드에서 API 호출 시도 (성공하면 상태 동기화)
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (response.ok) {
        const newGroup = await response.json()
        // API 성공 시 임시 ID를 실제 ID로 교체
        setGroups((prev) => prev.map((g) => 
          g.id === tempGroup.id ? { ...newGroup, textbooks: [] } : g
        ))
      }
    } catch {
      // API 실패해도 이미 로컬 상태에 추가됨
      console.log('API 미연결 - 로컬 상태로 동작')
    }
  }

  const handleDeleteGroup = async (id: string) => {
    const response = await fetch(`/api/groups/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete group')
    setGroups((prev) => prev.filter((g) => g.id !== id))
    if (selectedGroup?.id === id) {
      setSelectedGroup(null)
      setSelectedTextbook(null)
    }
  }

  const handleSelectGroup = (group: GroupWithTextbooks) => {
    setSelectedGroup(group)
    setSelectedTextbook(null)
  }

  const handleSelectNode = (node: TreeNode, parentGroup?: TreeNode, parentTextbook?: TreeNode, parentUnit?: TreeNode) => {
    if (node.type === 'group') {
      const group = groups.find((g) => g.id === node.id)
      if (group) {
        setSelectedGroup(group)
        setSelectedTextbook(null)
        setSelectedPassage(null)
      }
    } else if (node.type === 'textbook' && parentGroup) {
      setSelectedGroup(null)
      setSelectedTextbook({
        ...node,
        parentGroupId: parentGroup.id,
        parentGroupName: parentGroup.name,
      })
      setSelectedPassage(null)
    } else if (node.type === 'passage' && parentTextbook && parentUnit) {
      setSelectedGroup(null)
      setSelectedTextbook(null)
      setSelectedPassage({
        id: node.id,
        name: node.name,
        unitName: parentUnit.name,
        textbookName: parentTextbook.name,
      })
    }
  }

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleRegisterTextbook = async (data: {
    name: string
    units: { name: string; passages: { name: string; content?: string }[] }[]
  }) => {
    if (!selectedGroup) return

    try {
      const response = await fetch('/api/textbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          group_id: selectedGroup.id,
          units: data.units,
        }),
      })

      if (response.ok) {
        await fetchGroups()
        setExpandedIds((prev) => new Set([...prev, selectedGroup.id]))
        return
      }
    } catch {
      // API 실패 시 로컬 상태로 처리
    }

    // Supabase 미연결 시 로컬 임시 교재 생성
    const tempTextbook = {
      id: `temp-textbook-${Date.now()}`,
      name: data.name,
      units: data.units.map((unit, uIdx) => ({
        id: `temp-unit-${Date.now()}-${uIdx}`,
        name: unit.name,
        passages: unit.passages.map((passage, pIdx) => ({
          id: `temp-passage-${Date.now()}-${uIdx}-${pIdx}`,
          name: passage.name,
          content: passage.content || '',
        })),
      })),
    }

    setGroups((prev) =>
      prev.map((g) =>
        g.id === selectedGroup.id
          ? { ...g, textbooks: [...(g.textbooks || []), tempTextbook] }
          : g
      )
    )
    setExpandedIds((prev) => new Set([...prev, selectedGroup.id]))
    setSelectedGroup(null)
  }

  // 기존 교재 업데이트
  const handleUpdateTextbook = async (textbookId: string, data: {
    units: { 
      name: string
      passages: { 
        name: string
        content?: string
        koreanTranslation?: string
        sentences?: import('@/types').ParsedSentence[]
        splitModel?: string
        splitConfidence?: number
      }[] 
    }[]
  }) => {
    try {
      const response = await fetch(`/api/textbooks/${textbookId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: data.units }),
      })

      if (response.ok) {
        await fetchGroups()
        // 업데이트 완료 후 그룹 확장 유지
        if (selectedGroup) {
          setExpandedIds((prev) => new Set([...prev, selectedGroup.id]))
        }
        return
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update textbook')
      }
    } catch (err) {
      console.error('Error updating textbook:', err)
      throw err
    }
  }

  const handleMoveTextbook = async (targetGroupId: string) => {
    if (!selectedTextbook) return

    const response = await fetch(`/api/textbooks/${selectedTextbook.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: targetGroupId }),
    })

    if (!response.ok) throw new Error('Failed to move textbook')
    await fetchGroups()
    setSelectedTextbook(null)
    setExpandedIds((prev) => new Set([...prev, targetGroupId]))
  }

  const handleDeleteTextbook = async () => {
    if (!selectedTextbook) return

    try {
      const response = await fetch(`/api/textbooks/${selectedTextbook.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete textbook')
      }
      
      await fetchGroups()
      setSelectedTextbook(null)
    } catch (error) {
      console.error('Error deleting textbook:', error)
      alert('교재 삭제에 실패했습니다.')
    }
  }

  // 트리 노드 삭제 핸들러
  const handleDeleteNode = async (node: TreeNode) => {
    const typeLabels: Record<string, string> = {
      group: '그룹',
      textbook: '교재',
      unit: '단원',
      passage: '지문',
    }
    
    const label = typeLabels[node.type] || '항목'
    const childCount = node.children?.length || 0
    
    let message = `"${node.name}" ${label}을(를) 삭제하시겠습니까?`
    if (childCount > 0) {
      message += `\n\n⚠️ 하위 ${childCount}개 항목도 함께 삭제됩니다.`
    }
    
    if (!confirm(message)) return

    try {
      let endpoint = ''
      switch (node.type) {
        case 'group':
          endpoint = `/api/groups/${node.id}`
          break
        case 'textbook':
          endpoint = `/api/textbooks/${node.id}`
          break
        case 'unit':
          endpoint = `/api/units/${node.id}`
          break
        case 'passage':
          endpoint = `/api/passages/${node.id}`
          break
        default:
          throw new Error('Unknown node type')
      }

      const response = await fetch(endpoint, { method: 'DELETE' })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to delete ${node.type}`)
      }

      await fetchGroups()
      
      // 선택 상태 초기화
      if (selectedGroup?.id === node.id) setSelectedGroup(null)
      if (selectedTextbook?.id === node.id) setSelectedTextbook(null)
      if (selectedPassage?.id === node.id) setSelectedPassage(null)
      
    } catch (error) {
      console.error(`Error deleting ${node.type}:`, error)
      alert(`${label} 삭제에 실패했습니다.`)
    }
  }

  // 트리 노드 이름 변경 핸들러 (그룹, 교재, 단원 지원)
  const handleRenameNode = async (node: TreeNode, newName: string) => {
    const typeLabels: Record<string, string> = {
      group: '그룹',
      textbook: '교재',
      unit: '단원',
    }
    
    if (!['group', 'textbook', 'unit'].includes(node.type)) return
    
    try {
      let endpoint = ''
      switch (node.type) {
        case 'group':
          endpoint = `/api/groups/${node.id}`
          break
        case 'textbook':
          endpoint = `/api/textbooks/${node.id}`
          break
        case 'unit':
          endpoint = `/api/units/${node.id}`
          break
      }
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to rename ${node.type}`)
      }
      
      await fetchGroups()
    } catch (error) {
      console.error(`Error renaming ${node.type}:`, error)
      alert(`${typeLabels[node.type]} 이름 변경에 실패했습니다.`)
    }
  }

  // 그룹 순서 변경 핸들러
  const handleReorderGroups = async (reorderedGroups: { id: string; order_index: number }[]) => {
    try {
      const response = await fetch('/api/groups/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: reorderedGroups }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder groups')
      }

      await fetchGroups()
    } catch (error) {
      console.error('Error reordering groups:', error)
      alert('그룹 순서 변경에 실패했습니다.')
    }
  }

  // 교재 순서 변경 핸들러
  const handleReorderTextbooks = async (groupId: string, reorderedTextbooks: { id: string; order_index: number }[]) => {
    try {
      const response = await fetch('/api/textbooks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textbooks: reorderedTextbooks }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder textbooks')
      }

      await fetchGroups()
    } catch (error) {
      console.error('Error reordering textbooks:', error)
      alert('교재 순서 변경에 실패했습니다.')
    }
  }

  // 단원 순서 변경 핸들러
  const handleReorderUnits = async (textbookId: string, reorderedUnits: { id: string; order_index: number }[]) => {
    try {
      const response = await fetch('/api/units/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: reorderedUnits }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder units')
      }

      await fetchGroups()
    } catch (error) {
      console.error('Error reordering units:', error)
      alert('단원 순서 변경에 실패했습니다.')
    }
  }

  const treeNodes = convertToTreeNodes(groups)

  // 교재관리 탭에서 문장분리 모드이고 그룹 선택 시 Provider로 감싸기
  const isSheetImportMode = activeTab === '교재관리' && contentMode === '문장분리' && selectedGroup !== null
  // 데이터 생성 모드
  const isDataGenerateMode = activeTab === '교재관리' && contentMode === '데이터 생성'

  const mainLayout = (
    <div className="h-screen flex bg-muted/30">
      {/* 좌측 사이드바 */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab)
          setSelectedGroup(null)
          setSelectedTextbook(null)
          setSelectedPrompt(null)
          setIsEditingPrompt(false)
          setSelectedDataType(null)
          setIsEditingDataType(false)
          setSelectedQuestionType(null)
          setIsEditingQuestionType(false)
        }}
        settingMenu={settingMenu}
        setSettingMenu={(menu) => {
          setSettingMenu(menu)
          setSelectedPrompt(null)
          setIsEditingPrompt(false)
          setSelectedDataType(null)
          setIsEditingDataType(false)
          setSelectedQuestionType(null)
          setIsEditingQuestionType(false)
        }}
      >
        {/* 교재관리 탭 */}
        {activeTab === '교재관리' && (
          <div className="space-y-3">
            {/* 그룹 생성 UI */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="그룹명 입력"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement
                    if (input.value.trim()) {
                      handleCreateGroup(input.value.trim())
                      input.value = ''
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="그룹명 입력"]') as HTMLInputElement
                  if (input?.value.trim()) {
                    handleCreateGroup(input.value.trim())
                    input.value = ''
                  }
                }}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                등록
              </button>
            </div>

            {/* 트리 */}
            {isLoadingGroups ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                로딩 중...
              </div>
            ) : groups.length > 0 ? (
              <div className="border border-border rounded-md bg-muted/50">
                <TextbookTree
                  nodes={treeNodes}
                  selectedId={selectedGroup?.id || selectedTextbook?.id || selectedPassage?.id || null}
                  onSelect={handleSelectNode}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onDelete={handleDeleteNode}
                  onRename={handleRenameNode}
                  onReorderGroups={handleReorderGroups}
                  onReorderTextbooks={handleReorderTextbooks}
                  onReorderUnits={handleReorderUnits}
                />
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                그룹을 추가하세요
              </div>
            )}
          </div>
        )}

        {/* 회원관리 탭 */}
        {activeTab === '회원관리' && (
          <div className="py-8 text-center">
            <Users className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">회원관리 (향후 구현)</p>
          </div>
        )}

      </Sidebar>

      {/* 중앙 메인 콘텐츠 */}
      <MainContent 
        activeTab={activeTab} 
        settingMenu={settingMenu}
        contentMode={contentMode}
        onContentModeChange={setContentMode}
      >
        {/* 교재관리 - 문장분리 모드 */}
        {activeTab === '교재관리' && contentMode === '문장분리' && selectedGroup && (
          <SheetSelector 
            groupName={selectedGroup.name} 
            textbooks={selectedGroup.textbooks?.map(t => ({
              id: t.id,
              name: t.name,
              units: t.children?.map(u => ({
                id: u.id,
                name: u.name,
                passages: u.children?.map(p => ({
                  id: p.id,
                  name: p.name,
                }))
              }))
            })) || []}
            onRegister={handleRegisterTextbook}
            onUpdate={handleUpdateTextbook}
          />
        )}
        {activeTab === '교재관리' && contentMode === '문장분리' && selectedTextbook && (
          <TextbookDetail
            textbook={selectedTextbook}
            groups={groups}
            onMove={handleMoveTextbook}
            onDelete={handleDeleteTextbook}
            onUnitUpdate={async () => {
              // 단원 순서/이름 변경 후 데이터 다시 가져오기
              const textbookId = selectedTextbook.id
              const parentGroupId = selectedTextbook.parentGroupId
              const parentGroupName = selectedTextbook.parentGroupName
              
              // 현재 확장 상태 저장
              const currentExpandedIds = new Set(expandedIds)
              
              // 그룹 데이터 새로고침
              await fetchGroups()
              
              // 선택된 교재 데이터 직접 다시 가져오기
              try {
                const res = await fetch(`/api/textbooks?groupId=${parentGroupId}`)
                if (res.ok) {
                  const textbooks = await res.json()
                  const updatedTextbook = textbooks.find((t: TreeNode) => t.id === textbookId)
                  if (updatedTextbook) {
                    setSelectedTextbook({
                      ...updatedTextbook,
                      parentGroupId,
                      parentGroupName,
                    })
                    // 확장 상태 복원 (그룹과 교재 모두 확장 유지)
                    setExpandedIds(new Set([...currentExpandedIds, parentGroupId!, textbookId]))
                  }
                }
              } catch (error) {
                console.error('Error refreshing textbook:', error)
              }
            }}
          />
        )}
        {activeTab === '교재관리' && contentMode === '문장분리' && selectedPassage && (
          <PassageDetail
            passageId={selectedPassage.id}
            passageName={selectedPassage.name}
            unitName={selectedPassage.unitName}
            textbookName={selectedPassage.textbookName}
            onBack={() => setSelectedPassage(null)}
          />
        )}
        {activeTab === '교재관리' && contentMode === '문장분리' && !selectedGroup && !selectedTextbook && !selectedPassage && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderTree className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">좌측에서 그룹 또는 교재를 선택하세요</p>
            </div>
          </div>
        )}

        {/* 교재관리 - 데이터 생성 모드 */}
        {activeTab === '교재관리' && contentMode === '데이터 생성' && (
          <DataGenerator />
        )}

        {/* 교재관리 - 문제 생성 모드 (향후 구현) */}
        {activeTab === '교재관리' && contentMode === '문제 생성' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Database className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">문제 생성 기능은 향후 구현 예정입니다</p>
            </div>
          </div>
        )}

        {/* 회원관리 */}
        {activeTab === '회원관리' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">회원관리 실행 영역 (향후 구현)</p>
            </div>
          </div>
        )}

        {/* 설정 - 프롬프트 */}
        {activeTab === '설정' && settingMenu === '프롬프트' && (isEditingPrompt || selectedPrompt) && (
          <PromptForm
            prompt={selectedPrompt}
            isEditing={isEditingPrompt}
            onSave={handleSavePrompt}
            onDelete={handleDeletePrompt}
            onEdit={() => setIsEditingPrompt(true)}
            onCancel={() => {
              setIsEditingPrompt(false)
              if (!selectedPrompt) setSelectedPrompt(null)
            }}
          />
        )}
        {activeTab === '설정' && settingMenu === '프롬프트' && !isEditingPrompt && !selectedPrompt && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Sparkles className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">우측에서 프롬프트를 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}

        {/* 설정 - 데이터 유형 */}
        {activeTab === '설정' && settingMenu === '데이터 유형' && (isEditingDataType || selectedDataType) && (
          <DataTypeForm
            dataType={selectedDataType}
            allDataTypes={dataTypes}
            isEditing={isEditingDataType}
            onSave={handleSaveDataType}
            onDelete={handleDeleteDataType}
            onEdit={() => setIsEditingDataType(true)}
            onCancel={() => {
              setIsEditingDataType(false)
              if (!selectedDataType) setSelectedDataType(null)
            }}
          />
        )}
        {activeTab === '설정' && settingMenu === '데이터 유형' && !isEditingDataType && !selectedDataType && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Settings className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">우측에서 데이터 유형을 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}

        {/* 설정 - 문제 유형 */}
        {activeTab === '설정' && settingMenu === '문제 유형' && (isEditingQuestionType || selectedQuestionType) && (
          <QuestionTypeForm
            questionType={selectedQuestionType}
            allDataTypes={dataTypes}
            isEditing={isEditingQuestionType}
            onSave={handleSaveQuestionType}
            onDelete={handleDeleteQuestionType}
            onEdit={() => setIsEditingQuestionType(true)}
            onCancel={() => {
              setIsEditingQuestionType(false)
              if (!selectedQuestionType) setSelectedQuestionType(null)
            }}
            layoutOptions={{
              choiceLayout,
              choiceMarker,
              onLayoutChange: setChoiceLayout,
              onMarkerChange: setChoiceMarker,
            }}
          />
        )}
        {activeTab === '설정' && settingMenu === '문제 유형' && !isEditingQuestionType && !selectedQuestionType && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Settings className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">우측에서 문제 유형을 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}

        {/* 설정 - 시스템 설정 */}
        {activeTab === '설정' && settingMenu === '시스템 설정' && (
          <SystemSettings />
        )}
      </MainContent>

      {/* 우측 패널 */}
      <RightPanel
        title={
          isSheetImportMode
            ? '📝 문장 분리'
            : isDataGenerateMode
              ? '📊 데이터 생성'
              : activeTab === '설정' && settingMenu === '프롬프트'
                ? '프롬프트 목록'
                : activeTab === '설정' && settingMenu === '데이터 유형'
                  ? '데이터 유형 목록'
                  : activeTab === '설정' && settingMenu === '문제 유형'
                    ? '문제 유형 목록'
                    : '확장 기능'
        }
      >
        {/* 설정 - 프롬프트 목록 */}
        {activeTab === '설정' && settingMenu === '프롬프트' && (
          <PromptList
            prompts={prompts}
            selectedPromptId={selectedPrompt?.id || null}
            onSelectPrompt={(prompt) => {
              setSelectedPrompt(prompt)
              setIsEditingPrompt(false)
            }}
            onAddNew={() => {
              setSelectedPrompt(null)
              setIsEditingPrompt(true)
            }}
            isLoading={isLoadingPrompts}
          />
        )}

        {/* 설정 - 데이터 유형 목록 */}
        {activeTab === '설정' && settingMenu === '데이터 유형' && (
          <DataTypeList
            dataTypes={dataTypes}
            isLoading={isLoadingDataTypes}
            selectedId={selectedDataType?.id || null}
            onSelect={(dt) => {
              setSelectedDataType(dt)
              setIsEditingDataType(false)
            }}
            onAdd={() => {
              setSelectedDataType(null)
              setIsEditingDataType(true)
            }}
          />
        )}

        {/* 설정 - 문제 유형 목록 */}
        {activeTab === '설정' && settingMenu === '문제 유형' && (
          <div className="space-y-4">
            <QuestionTypeList
              questionTypes={questionTypes}
              isLoading={isLoadingQuestionTypes}
              selectedId={selectedQuestionType?.id || null}
              onSelect={(qt) => {
                setSelectedQuestionType(qt)
                setIsEditingQuestionType(false)
                setChoiceLayout(qt.choice_layout)
                setChoiceMarker(qt.choice_marker)
              }}
              onAdd={() => {
                setSelectedQuestionType(null)
                setIsEditingQuestionType(true)
                setChoiceLayout('vertical')
                setChoiceMarker('circle')
              }}
            />

            {/* 레이아웃 옵션 (선택된 문제 유형이 있을 때만) */}
            {(isEditingQuestionType || selectedQuestionType) && (
              <div className="border-t border-border pt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">선택지 배열</label>
                  <RadioGroup value={choiceLayout} onValueChange={setChoiceLayout} disabled={!isEditingQuestionType}>
                    {CHOICE_LAYOUTS.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2 p-2 border border-border rounded-md">
                        <RadioGroupItem value={opt.value} id={`layout-${opt.value}`} />
                        <label htmlFor={`layout-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">선택지 번호</label>
                  <RadioGroup value={choiceMarker} onValueChange={setChoiceMarker} disabled={!isEditingQuestionType}>
                    {CHOICE_MARKERS.map((opt) => (
                      <div key={opt.value} className="flex items-center gap-2 p-2 border border-border rounded-md">
                        <RadioGroupItem value={opt.value} id={`marker-${opt.value}`} />
                        <label htmlFor={`marker-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="border-t border-border pt-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">출력물 구성</label>
                  <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-md">
                    <p>📄 문제지.pdf (문제만)</p>
                    <p>📄 정답지.pdf (정답만)</p>
                    <p>📄 해설지.pdf (정답+해설)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 교재관리 - 문장 분리 패널 */}
        {isSheetImportMode && <SplitDetailPanel />}

        {/* 교재관리 - 데이터 생성 패널 */}
        {isDataGenerateMode && (
          <DataGeneratePanel />
        )}

        {/* 기본 메시지 */}
        {!isSheetImportMode && !isDataGenerateMode && activeTab !== '설정' && (
          <p className="text-muted-foreground text-sm">현재 작업과 관련된 확장 기능이 여기에 표시됩니다.</p>
        )}
      </RightPanel>
    </div>
  )

  // 교재관리 - 문장분리 모드일 때 SheetImportProvider로 감싸기
  if (isSheetImportMode) {
    return <SheetImportProvider>{mainLayout}</SheetImportProvider>
  }

  // 교재관리 - 데이터 생성 모드일 때 DataGenerateProvider로 감싸기
  if (isDataGenerateMode) {
    return <DataGenerateProvider>{mainLayout}</DataGenerateProvider>
  }

  return mainLayout
}

// 시스템 설정 컴포넌트
function SystemSettings() {
  const [splitModel, setSplitModel] = useState<ModelId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('splitModel') as ModelId) || 'gemini-2.0-flash'
    }
    return 'gemini-2.0-flash'
  })
  
  const [splitMode, setSplitMode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('splitMode') || 'parallel'
    }
    return 'parallel'
  })

  const handleSaveSettings = () => {
    localStorage.setItem('splitModel', splitModel)
    localStorage.setItem('splitMode', splitMode)
    alert('설정이 저장되었습니다.')
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">⚙️ 시스템 설정</h2>
      
      {/* 문장 분리 설정 */}
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI 문장 분리 설정
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            교재 등록 시 사용할 AI 모델과 분리 모드를 설정합니다.
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">AI 모델</label>
            <select
              value={splitModel}
              onChange={(e) => setSplitModel(e.target.value as ModelId)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {SENTENCE_SPLIT_MODELS.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label} - {model.description}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">분리 모드</label>
            <select
              value={splitMode}
              onChange={(e) => setSplitMode(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="parallel">🔗 병렬 매칭 (추천)</option>
              <option value="ai-verify">✅ AI 검증</option>
              <option value="hybrid">🔄 하이브리드</option>
              <option value="regex">📝 Regex (무료)</option>
              <option value="ai">🤖 AI Only</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleSaveSettings}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          설정 저장
        </button>
      </div>
    </div>
  )
}
