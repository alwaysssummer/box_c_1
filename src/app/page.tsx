'use client'

import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { RightPanel } from '@/components/layout/RightPanel'
import { GroupList, TextbookTree, SheetSelector, SplitDetailPanel, TextbookDetail } from '@/components/features/textbook'
import { SheetImportProvider } from '@/contexts/SheetImportContext'
import { PromptList, PromptForm } from '@/components/features/prompt'
import { DataTypeList, DataTypeForm, type DataTypeItem } from '@/components/features/data-type'
import { QuestionTypeList, QuestionTypeForm, type QuestionTypeItem } from '@/components/features/question-type'
import { ActiveTab, SettingMenu, TreeNode, GroupWithTextbooks, CHOICE_LAYOUTS, CHOICE_MARKERS, type ModelId } from '@/types'
import type { Prompt } from '@/types/database'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FolderTree, Settings, Users, Sparkles } from 'lucide-react'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('교재관리')
  const [settingMenu, setSettingMenu] = useState<SettingMenu>('데이터 유형')
  
  // 교재관리 상태
  const [groups, setGroups] = useState<GroupWithTextbooks[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<GroupWithTextbooks | null>(null)
  const [selectedTextbook, setSelectedTextbook] = useState<(TreeNode & { parentGroupId?: string; parentGroupName?: string }) | null>(null)
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

  const convertToTreeNodes = (groups: GroupWithTextbooks[]): TreeNode[] => {
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      type: 'group' as const,
      children: group.textbooks?.map((textbook) => ({
        id: textbook.id,
        name: textbook.name,
        type: 'textbook' as const,
        children: textbook.units?.map((unit) => ({
          id: unit.id,
          name: unit.name,
          type: 'unit' as const,
          children: unit.passages?.map((passage) => ({
            id: passage.id,
            name: passage.name,
            type: 'passage' as const,
            children: [],
          })) || [],
        })) || [],
      })) || [],
    }))
  }

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

  const handleSelectNode = (node: TreeNode, parentGroup?: TreeNode) => {
    if (node.type === 'group') {
      const group = groups.find((g) => g.id === node.id)
      if (group) {
        setSelectedGroup(group)
        setSelectedTextbook(null)
      }
    } else if (node.type === 'textbook' && parentGroup) {
      setSelectedGroup(null)
      setSelectedTextbook({
        ...node,
        parentGroupId: parentGroup.id,
        parentGroupName: parentGroup.name,
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

  const treeNodes = convertToTreeNodes(groups)

  // 교재관리 탭에서 그룹 선택 시 Provider로 감싸기
  const isSheetImportMode = activeTab === '교재관리' && selectedGroup !== null

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
            <GroupList
              groups={groups}
              isLoading={isLoadingGroups}
              selectedGroupId={selectedGroup?.id || null}
              onSelectGroup={handleSelectGroup}
              onCreateGroup={handleCreateGroup}
              onDeleteGroup={handleDeleteGroup}
            />
            {groups.length > 0 && (
              <div className="border border-border rounded-md bg-muted/50">
                <TextbookTree
                  nodes={treeNodes}
                  selectedId={selectedGroup?.id || selectedTextbook?.id || null}
                  onSelect={handleSelectNode}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                />
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

        {/* 설정 - 프롬프트 */}
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

        {/* 설정 - 데이터 유형 */}
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

        {/* 설정 - 문제 유형 */}
        {activeTab === '설정' && settingMenu === '문제 유형' && (
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
        )}

        {/* 설정 - 설정 */}
        {activeTab === '설정' && settingMenu === '설정' && (
          <div className="py-8 text-center">
            <Settings className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">시스템 설정 (향후 구현)</p>
          </div>
        )}
      </Sidebar>

      {/* 중앙 메인 콘텐츠 */}
      <MainContent activeTab={activeTab} settingMenu={settingMenu}>
        {/* 교재관리 */}
        {activeTab === '교재관리' && selectedGroup && (
          <SheetSelector groupName={selectedGroup.name} onRegister={handleRegisterTextbook} />
        )}
        {activeTab === '교재관리' && selectedTextbook && (
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
        {activeTab === '교재관리' && !selectedGroup && !selectedTextbook && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FolderTree className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">좌측에서 그룹 또는 교재를 선택하세요</p>
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
              <p className="text-muted-foreground">좌측에서 프롬프트를 선택하거나 새로 추가하세요</p>
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
              <p className="text-muted-foreground">좌측에서 데이터 유형을 선택하거나 새로 추가하세요</p>
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
              <p className="text-muted-foreground">좌측에서 문제 유형을 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}

        {/* 설정 - 설정 */}
        {activeTab === '설정' && settingMenu === '설정' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Settings className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">시스템 설정 영역 (향후 구현)</p>
            </div>
          </div>
        )}
      </MainContent>

      {/* 우측 패널 */}
      <RightPanel
        title={
          isSheetImportMode
            ? '📝 문장 분리'
            : activeTab === '설정' && settingMenu === '문제 유형' && (isEditingQuestionType || selectedQuestionType)
              ? '레이아웃 옵션'
              : '확장 기능'
        }
      >
        {activeTab === '설정' && settingMenu === '문제 유형' && (isEditingQuestionType || selectedQuestionType) ? (
          <div className="space-y-4">
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
        ) : isSheetImportMode ? (
          <SplitDetailPanel />
        ) : (
          <p className="text-muted-foreground text-sm">현재 작업과 관련된 확장 기능이 여기에 표시됩니다.</p>
        )}
      </RightPanel>
    </div>
  )

  // 교재관리 모드일 때만 Provider로 감싸기
  if (isSheetImportMode) {
    return <SheetImportProvider>{mainLayout}</SheetImportProvider>
  }

  return mainLayout
}
