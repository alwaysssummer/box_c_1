'use client'

import { useState, useCallback, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent, type ContentMode } from '@/components/layout/MainContent'
import { RightPanel } from '@/components/layout/RightPanel'
import { TextbookTree, SheetSelector, SplitDetailPanel, TextbookDetail, PassageDetail } from '@/components/features/textbook'
import { SheetImportProvider } from '@/contexts/SheetImportContext'
import { StatusDashboard, ManageFilterPanel } from '@/components/features/status-dashboard'
import { OneClickGeneration } from '@/components/features/generation'
import { PromptList, PromptForm } from '@/components/features/prompt'
import { DataTypeList, DataTypeForm, type DataTypeItem } from '@/components/features/data-type'
import { Badge } from '@/components/ui/badge'
import { 
  QuestionTypeFormNew, 
  QuestionTypeModeSelector,
  QuestionTypeGroupManager,
  PromptBasedForm,
  type QuestionTypeItem,
  type QuestionTypeMode,
  type PromptBasedFormData,
} from '@/components/features/question-type'
// 새로운 4단계 위자드 시스템
import { BlockList, BlockForm } from '@/components/features/block'
import { QuestionTypeList, QuestionTypeForm } from '@/components/features/question-type'
import type { BlockDefinition, QuestionType, QuestionTypeWithBlocks, StatusGroup, StatusTextbook, Group, Textbook } from '@/types/database'
import { ActiveTab, SettingMenu, TreeNode, GroupWithTextbooks, TextbookWithUnits, CHOICE_LAYOUTS, CHOICE_MARKERS, type ModelId, SENTENCE_SPLIT_MODELS } from '@/types'
import type { Prompt } from '@/types/database'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FolderTree, Settings, Users, Sparkles, Database, Layers } from 'lucide-react'
import { convertToTreeNodes } from '@/lib/tree-utils'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('교재관리')
  const [settingMenu, setSettingMenu] = useState<SettingMenu>('블록 관리')
  
  // 교재관리 서브 모드 (현황, 문장분리) - 원큐 출제 시스템으로 통합
  const [contentMode, setContentMode] = useState<ContentMode>('현황')
  
  // 문제출제 모드 - 원큐 문제 생성용 지문 선택 (지문 단위 선택)
  const [selectedPassageIdsForGenerate, setSelectedPassageIdsForGenerate] = useState<string[]>([])
  
  // 문제관리 모드 - 교재 선택 (멀티)
  const [selectedTextbookIdsForManage, setSelectedTextbookIdsForManage] = useState<string[]>([])
  
  // 문제관리 모드 - 트리에서 선택한 노드
  const [selectedManageNode, setSelectedManageNode] = useState<{
    type: 'group' | 'textbook' | 'unit' | 'passage'
    id: string
    name: string
    textbookId?: string
  } | null>(null)
  
  // 교재관리 상태 (임시 교재 추가를 위해 유연한 타입 사용)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [groups, setGroups] = useState<any[]>([])
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
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([])
  const [isLoadingQuestionTypes, setIsLoadingQuestionTypes] = useState(true)
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType | null>(null)
  const [isEditingQuestionType, setIsEditingQuestionType] = useState(false)
  const [choiceLayout, setChoiceLayout] = useState('vertical')
  const [choiceMarker, setChoiceMarker] = useState('circle')
  // 문제 유형 추가 모드 (null: 기본, 'select': 입구 선택, 'prompt_based': 프롬프트 원큐, 'slot_based': 슬롯 기반)
  const [questionTypeAddMode, setQuestionTypeAddMode] = useState<QuestionTypeMode | 'select' | null>(null)

  // 프롬프트 상태
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [newPromptIsQuestionType, setNewPromptIsQuestionType] = useState<boolean | null>(null)  // 새 프롬프트 초기 타입

  // 현황 배지용 상태
  const [statusInfo, setStatusInfo] = useState<Map<string, { completed: number; total: number }>>(new Map())

  // ============ 새로운 블록 기반 시스템 상태 ============
  const [blocks, setBlocks] = useState<BlockDefinition[]>([])
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true)
  const [selectedBlock, setSelectedBlock] = useState<BlockDefinition | null>(null)
  const [isEditingBlock, setIsEditingBlock] = useState(false)

  // 새로운 문제 유형 (4단계 위자드) - 기존 questionTypes 상태 사용
  const [isEditingQuestionTypeNew, setIsEditingQuestionTypeNew] = useState(false)

  // ============ 현황 배지 함수 ============

  const fetchStatusInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      
      // hierarchy에서 그룹/교재별 현황 추출
      const newStatusInfo = new Map<string, { completed: number; total: number }>()
      
      data.hierarchy?.forEach((group: StatusGroup) => {
        newStatusInfo.set(group.id, { 
          completed: group.passageCount, // 문장분리 완료된 것 기준
          total: group.passageCount 
        })
        group.textbooks?.forEach((textbook: StatusTextbook) => {
          newStatusInfo.set(textbook.id, { 
            completed: textbook.passageCount,
            total: textbook.passageCount 
          })
        })
      })
      
      setStatusInfo(newStatusInfo)
    } catch (error) {
      console.error('Error fetching status info:', error)
    }
  }, [])

  // ============ 교재관리 함수들 ============

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true)
      const response = await fetch('/api/groups')
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()
      
      if (Array.isArray(data) && data.length > 0) {
        const groupsWithTextbooks = await Promise.all(
          data.map(async (group: Group) => {
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
    group: string
    subType?: string
    instruction: string
    layoutTemplateId: string
    slotMapping: { slotId: string; dataTypeId: string; dataTypeName: string }[]
    hasAnswer: boolean
    hasExplanation: boolean
    choiceLayout: string
    choiceMarker: string
    isSet: boolean
    setCount: number
    generationMode: 'prompt_direct' | 'slot_based'
    promptId: string | null
  }) => {
    // 새 폼 데이터를 API 형식으로 변환
    const apiData = {
      id: formData.id,
      name: formData.name,
      instruction: formData.instruction,
      // slotMapping을 dataTypeList로 변환
      dataTypeList: formData.slotMapping.map(slot => ({
        dataTypeId: slot.dataTypeId,
        role: slot.slotId, // slotId를 role로 매핑
      })),
      choiceLayout: formData.choiceLayout,
      choiceMarker: formData.choiceMarker,
      // 새 필드들 (API에서 처리 필요)
      group: formData.group,
      subType: formData.subType,
      layoutTemplateId: formData.layoutTemplateId,
      hasAnswer: formData.hasAnswer,
      hasExplanation: formData.hasExplanation,
      isSet: formData.isSet,
      setCount: formData.setCount,
      // 출제 방식 관련
      promptId: formData.generationMode === 'prompt_direct' ? formData.promptId : null,
    }

    const url = formData.id ? `/api/question-types/${formData.id}` : '/api/question-types'
    const method = formData.id ? 'PATCH' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiData),
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
    isQuestionType: boolean
    questionGroup: 'practical' | 'selection' | 'writing' | 'analysis' | 'vocabulary'
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
    await fetchQuestionTypes() // 문제 유형도 다시 불러오기
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

  // ============ 블록 관리 함수들 (새 시스템) ============

  const fetchBlocks = useCallback(async () => {
    try {
      setIsLoadingBlocks(true)
      const response = await fetch('/api/block-definitions')
      if (!response.ok) throw new Error('Failed to fetch blocks')
      const data = await response.json()
      setBlocks(data)
    } catch (error) {
      console.error('Error fetching blocks:', error)
    } finally {
      setIsLoadingBlocks(false)
    }
  }, [])

  const handleSaveBlock = async (formData: {
    id: string | null
    label: string
    type: 'single' | 'bundle'
    unit: 'passage' | 'sentence'
    prompt: string
    output_fields: { key: string; type: string }[]
    description: string
    is_active: boolean
  }) => {
    console.log('[page.tsx] handleSaveBlock - sending:', {
      id: formData.id,
      label: formData.label,
      output_fields: formData.output_fields,
      count: formData.output_fields.length
    })
    
    const url = formData.id ? `/api/block-definitions/${formData.id}` : '/api/block-definitions'
    const method = formData.id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!response.ok) throw new Error('Failed to save block')
    
    const result = await response.json()
    console.log('[page.tsx] handleSaveBlock - saved result:', {
      id: result.id,
      label: result.label,
      output_fields: result.output_fields,
      count: result.output_fields?.length
    })
    
    await fetchBlocks()
    setSelectedBlock(null)
    setIsEditingBlock(false)
  }

  const handleDeleteBlock = async (id: string) => {
    const response = await fetch(`/api/block-definitions/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) throw new Error('Failed to delete block')
    
    await fetchBlocks()
    if (selectedBlock?.id === id) {
      setSelectedBlock(null)
      setIsEditingBlock(false)
    }
  }

  // ============ 새 문제 유형 함수들 (4단계 위자드) ============
  // fetchQuestionTypes를 재사용하므로 별도 함수 불필요

  const handleSaveQuestionTypeNew = async (formData: {
    name: string
    output_type: 'question' | 'study_material'
    question_group: 'csat' | 'school_passage' | 'school_sentence' | 'study'
    required_block_ids: string[]
    layout_config: import('@/types/database').LayoutConfig
    output_config?: import('@/types/output-config').OutputConfig  // 새로운 출력 설정 v2.0
  }) => {
    const url = selectedQuestionType 
      ? `/api/question-types/${selectedQuestionType.id}` 
      : '/api/question-types'
    const method = selectedQuestionType ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!response.ok) throw new Error('Failed to save question type')
    
    await fetchQuestionTypes()
    setSelectedQuestionType(null)
    setIsEditingQuestionTypeNew(false)
  }

  const handleDeleteQuestionTypeNew = async (id: string) => {
    const response = await fetch(`/api/question-types/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) throw new Error('Failed to delete question type')
    
    await fetchQuestionTypes()
    if (selectedQuestionType?.id === id) {
      setSelectedQuestionType(null)
      setIsEditingQuestionTypeNew(false)
    }
  }

  // ============ 초기 로드 ============

  useEffect(() => {
    fetchGroups()
    fetchDataTypes()
    fetchQuestionTypes()
    fetchPrompts()
    fetchBlocks()
    // fetchQuestionTypesNew는 fetchQuestionTypes와 동일한 데이터를 가져오므로 제거
  }, [fetchGroups, fetchDataTypes, fetchQuestionTypes, fetchPrompts, fetchBlocks])

  // 현황 모드일 때 현황 데이터 로드
  useEffect(() => {
    if (activeTab === '교재관리' && contentMode === '현황') {
      fetchStatusInfo()
    }
  }, [activeTab, contentMode, fetchStatusInfo])

  // ============ 교재관리 헬퍼 함수들 ============

  const handleCreateGroup = async (name: string) => {
    console.log('handleCreateGroup called:', name)
    // Supabase 미연결 시에도 로컬 상태로 바로 처리
    const tempGroup: GroupWithTextbooks = { 
      id: `temp-${Date.now()}`, 
      name, 
      textbooks: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
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
    // 문제관리 모드일 때 필터 연동용 노드 저장
    if (contentMode === '문제관리') {
      if (node.type === 'group') {
        setSelectedManageNode({ type: 'group', id: node.id, name: node.name })
      } else if (node.type === 'textbook') {
        setSelectedManageNode({ type: 'textbook', id: node.id, name: node.name })
      } else if (node.type === 'unit' && parentTextbook) {
        setSelectedManageNode({ type: 'unit', id: node.id, name: node.name, textbookId: parentTextbook.id })
      } else if (node.type === 'passage' && parentTextbook) {
        setSelectedManageNode({ type: 'passage', id: node.id, name: node.name, textbookId: parentTextbook.id })
      }
    }
    
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

            {/* 전체 선택/해제 버튼 (문제관리 모드) */}
            {contentMode === '문제관리' && groups.length > 0 && (
              <div className="mb-2 px-2">
                <button
                  onClick={() => {
                    const allTextbookIds = groups.flatMap((g: { textbooks?: { id: string }[] }) => 
                      g.textbooks?.map(t => t.id) || []
                    )
                    if (selectedTextbookIdsForManage.length === allTextbookIds.length) {
                      setSelectedTextbookIdsForManage([])
                    } else {
                      setSelectedTextbookIdsForManage(allTextbookIds)
                    }
                  }}
                  className="w-full px-3 py-2 text-xs font-medium bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md flex items-center justify-center gap-2 transition-colors"
                >
                  {selectedTextbookIdsForManage.length === groups.flatMap((g: { textbooks?: { id: string }[] }) => g.textbooks?.map(t => t.id) || []).length 
                    ? '✓ 전체 해제' 
                    : '☐ 전체 선택'}
                </button>
              </div>
            )}

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
                  selectionMode={contentMode === '문제출제' ? 'passage' : contentMode === '문제관리' ? 'textbook' : undefined}
                  selectedTextbookIds={contentMode === '문제관리' ? selectedTextbookIdsForManage : []}
                  selectedPassageIds={contentMode === '문제출제' ? selectedPassageIdsForGenerate : []}
                  onToggleTextbookSelection={(textbookId) => {
                    if (contentMode === '문제관리') {
                      setSelectedTextbookIdsForManage(prev => 
                        prev.includes(textbookId)
                          ? prev.filter(id => id !== textbookId)
                          : [...prev, textbookId]
                      )
                    }
                  }}
                  onToggleGroupSelection={(groupId, textbookIds) => {
                    if (contentMode === '문제관리') {
                      setSelectedTextbookIdsForManage(prev => {
                        const allSelected = textbookIds.every(id => prev.includes(id))
                        if (allSelected) {
                          return prev.filter(id => !textbookIds.includes(id))
                        } else {
                          return [...new Set([...prev, ...textbookIds])]
                        }
                      })
                    }
                  }}
                  onTogglePassageSelection={(passageId) => {
                    if (contentMode === '문제출제') {
                      setSelectedPassageIdsForGenerate(prev => 
                        prev.includes(passageId)
                          ? prev.filter(id => id !== passageId)
                          : [...prev, passageId]
                      )
                    }
                  }}
                  onToggleUnitSelection={(unitId, passageIds) => {
                    if (contentMode === '문제출제') {
                      setSelectedPassageIdsForGenerate(prev => {
                        const allSelected = passageIds.length > 0 && passageIds.every(id => prev.includes(id))
                        if (allSelected) {
                          // 전체 선택됨 → 해제
                          return prev.filter(id => !passageIds.includes(id))
                        } else {
                          // 새 유닛 선택 → 해당 유닛의 지문으로 대체 (다른 교재 지문 제거)
                          return passageIds
                        }
                      })
                    }
                  }}
                  onToggleTextbookPassageSelection={(textbookId, passageIds) => {
                    if (contentMode === '문제출제') {
                      setSelectedPassageIdsForGenerate(prev => {
                        const allSelected = passageIds.length > 0 && passageIds.every(id => prev.includes(id))
                        if (allSelected) {
                          // 전체 선택됨 → 해제
                          return prev.filter(id => !passageIds.includes(id))
                        } else {
                          // 새 교재 선택 → 해당 교재의 지문으로 대체
                          return passageIds
                        }
                      })
                    }
                  }}
                  onToggleGroupPassageSelection={(groupId, passageIds) => {
                    if (contentMode === '문제출제') {
                      setSelectedPassageIdsForGenerate(prev => {
                        const allSelected = passageIds.length > 0 && passageIds.every(id => prev.includes(id))
                        if (allSelected) {
                          // 전체 선택됨 → 해제
                          return prev.filter(id => !passageIds.includes(id))
                        } else {
                          // 새 그룹 선택 → 해당 그룹의 지문으로 대체
                          return passageIds
                        }
                      })
                    }
                  }}
                  statusInfo={contentMode === '현황' ? statusInfo : undefined}
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
        {/* 교재관리 - 현황 모드 (통계만) */}
        {activeTab === '교재관리' && contentMode === '현황' && (
          <StatusDashboard mode="status" />
        )}

        {/* 교재관리 - 문제출제 모드 (원큐 시스템) */}
        {activeTab === '교재관리' && contentMode === '문제출제' && (
          <OneClickGeneration 
            selectedPassageIds={selectedPassageIdsForGenerate}
            onComplete={() => {
              // ⭐ 등록 완료 시 문제관리 탭으로 자동 전환
              setContentMode('문제관리')
            }}
          />
        )}

        {/* 교재관리 - 문제관리 모드 */}
        {activeTab === '교재관리' && contentMode === '문제관리' && (
          <StatusDashboard
            mode="manage"
            selectedNode={selectedManageNode}
            selectedTextbookIds={selectedTextbookIdsForManage}
            onTextbookSelectionChange={setSelectedTextbookIdsForManage}
          />
        )}

        {/* 교재관리 - 문장분리 모드 */}
        {activeTab === '교재관리' && contentMode === '문장분리' && selectedGroup && (
          <SheetSelector 
            groupName={selectedGroup.name} 
            textbooks={selectedGroup.textbooks?.map((t: TextbookWithUnits) => ({
              id: t.id,
              name: t.name,
              units: t.units?.map(u => ({
                id: u.id,
                name: u.name,
                passages: u.passages?.map(p => ({
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

        {/* 회원관리 */}
        {activeTab === '회원관리' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">회원관리 실행 영역 (향후 구현)</p>
            </div>
          </div>
        )}

        {/* 설정 - 블록 관리 (새 시스템) */}
        {activeTab === '설정' && settingMenu === '블록 관리' && (isEditingBlock || selectedBlock) && (
          <BlockForm
            block={selectedBlock}
            isEditing={isEditingBlock}
            onSave={handleSaveBlock}
            onDelete={async () => {
              if (selectedBlock) await handleDeleteBlock(selectedBlock.id)
            }}
            onEdit={() => setIsEditingBlock(true)}
            onCancel={() => {
              setIsEditingBlock(false)
              if (!selectedBlock) setSelectedBlock(null)
            }}
          />
        )}
        {activeTab === '설정' && settingMenu === '블록 관리' && !isEditingBlock && !selectedBlock && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Layers className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">우측에서 블록을 선택하거나 새로 추가하세요</p>
            </div>
          </div>
        )}

        {/* 설정 - 문제 유형 (4단계 위자드) */}
        {activeTab === '설정' && settingMenu === '문제 유형' && isEditingQuestionTypeNew && (
          <QuestionTypeForm
            initialData={selectedQuestionType ? {
              id: selectedQuestionType.id,
              name: selectedQuestionType.name,
              output_type: selectedQuestionType.output_type || 'question',
              question_group: selectedQuestionType.question_group || 'csat',
              required_block_ids: selectedQuestionType.required_block_ids || [],
              layout_config: selectedQuestionType.layout_config,
              output_config: selectedQuestionType.output_config,
            } : undefined}
            onSave={handleSaveQuestionTypeNew}
            onCancel={() => {
              setIsEditingQuestionTypeNew(false)
              setSelectedQuestionType(null)
            }}
          />
        )}
        {activeTab === '설정' && settingMenu === '문제 유형' && !isEditingQuestionTypeNew && (
          <QuestionTypeList
            questionTypes={questionTypes as QuestionTypeWithBlocks[]}
            isLoading={isLoadingQuestionTypes}
            onAdd={() => {
              setSelectedQuestionType(null)
              setIsEditingQuestionTypeNew(true)
            }}
            onEdit={(id) => {
              const qt = questionTypes.find(q => q.id === id)
              if (qt) {
                setSelectedQuestionType(qt)
                setIsEditingQuestionTypeNew(true)
              }
            }}
            onDelete={handleDeleteQuestionTypeNew}
          />
        )}

        {/* 설정 - 프롬프트 */}
        {activeTab === '설정' && settingMenu === '프롬프트' && (isEditingPrompt || selectedPrompt) && (
          <PromptForm
            prompt={selectedPrompt}
            isEditing={isEditingPrompt}
            initialIsQuestionType={newPromptIsQuestionType}
            onSave={handleSavePrompt}
            onDelete={handleDeletePrompt}
            onEdit={() => setIsEditingPrompt(true)}
            onCancel={() => {
              setIsEditingPrompt(false)
              if (!selectedPrompt) setSelectedPrompt(null)
              setNewPromptIsQuestionType(null)
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

        {/* 설정 - 문제 유형: 입구 선택 */}
        {activeTab === '설정' && settingMenu === '문제 유형' && questionTypeAddMode === 'select' && (
          <QuestionTypeModeSelector
            onSelect={(mode) => setQuestionTypeAddMode(mode)}
            onCancel={() => setQuestionTypeAddMode(null)}
          />
        )}

        {/* 설정 - 문제 유형: 프롬프트 원큐 폼 */}
        {activeTab === '설정' && settingMenu === '문제 유형' && questionTypeAddMode === 'prompt_based' && (
          <PromptBasedForm
            existingData={null}
            allPrompts={prompts.map(p => ({ 
              id: p.id, 
              name: p.name, 
              category: p.category,
              question_group: (p as { question_group?: string }).question_group,
              status: p.status,
            }))}
            isEditing={true}
            onSave={async (data: PromptBasedFormData) => {
              // 프롬프트 기반 문제 유형 저장
              const response = await fetch('/api/question-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: data.name,
                  instruction: data.instruction || null,
                  choice_layout: data.choiceLayout,
                  choice_marker: data.choiceMarker,
                  prompt_id: data.promptId,
                  question_group: data.questionGroup,
                }),
              })
              if (response.ok) {
                await fetchQuestionTypes()
                setQuestionTypeAddMode(null)
              }
            }}
            onCancel={() => setQuestionTypeAddMode(null)}
            onBack={() => setQuestionTypeAddMode('select')}
          />
        )}

        {/* 설정 - 문제 유형: 슬롯 기반 폼 (신규) */}
        {activeTab === '설정' && settingMenu === '문제 유형' && questionTypeAddMode === 'slot_based' && (
          <QuestionTypeFormNew
            questionType={null}
            allDataTypes={dataTypes}
            allPrompts={prompts.map(p => ({ id: p.id, name: p.name, category: p.category }))}
            isEditing={true}
            onSave={handleSaveQuestionType as (data: unknown) => Promise<void>}
            onDelete={async () => {}}
            onEdit={() => {}}
            onCancel={() => setQuestionTypeAddMode(null)}
          />
        )}

        {/* 설정 - 문제 유형: 기존 편집/조회 */}
        {activeTab === '설정' && settingMenu === '문제 유형' && !questionTypeAddMode && (isEditingQuestionType || selectedQuestionType) && (
          selectedQuestionType?.prompt_id ? (
            // 프롬프트 기반 문제 유형 편집
            <PromptBasedForm
              existingData={{
                id: selectedQuestionType.id,
                name: selectedQuestionType.name,
                prompt_id: selectedQuestionType.prompt_id || null,
                instruction: selectedQuestionType.instruction,
                choice_layout: selectedQuestionType.choice_layout,
                choice_marker: selectedQuestionType.choice_marker,
                question_group: selectedQuestionType.question_group || null,
              }}
              allPrompts={prompts.map(p => ({ 
                id: p.id, 
                name: p.name, 
                category: p.category,
                question_group: (p as { question_group?: string }).question_group,
                status: p.status,
              }))}
              isEditing={isEditingQuestionType}
              onSave={async (data: PromptBasedFormData) => {
                if (!selectedQuestionType) return
                const response = await fetch(`/api/question-types/${selectedQuestionType.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: data.name,
                    instruction: data.instruction || null,
                    choice_layout: data.choiceLayout,
                    choice_marker: data.choiceMarker,
                    prompt_id: data.promptId,
                    question_group: data.questionGroup,
                  }),
                })
                if (response.ok) {
                  await fetchQuestionTypes()
                  setIsEditingQuestionType(false)
                }
              }}
              onDelete={handleDeleteQuestionType}
              onEdit={() => setIsEditingQuestionType(true)}
              onCancel={() => {
                setIsEditingQuestionType(false)
                if (!selectedQuestionType) setSelectedQuestionType(null)
              }}
            />
          ) : (
            // 슬롯 기반 문제 유형 편집 (기존)
            <QuestionTypeFormNew
              questionType={selectedQuestionType}
              allDataTypes={dataTypes}
              allPrompts={prompts.map(p => ({ id: p.id, name: p.name, category: p.category }))}
              isEditing={isEditingQuestionType}
              onSave={handleSaveQuestionType as (data: unknown) => Promise<void>}
              onDelete={handleDeleteQuestionType}
              onEdit={() => setIsEditingQuestionType(true)}
              onCancel={() => {
                setIsEditingQuestionType(false)
                if (!selectedQuestionType) setSelectedQuestionType(null)
              }}
            />
          )
        )}

        {/* 설정 - 문제 유형: 기본 안내 */}
        {activeTab === '설정' && settingMenu === '문제 유형' && !questionTypeAddMode && !isEditingQuestionType && !selectedQuestionType && (
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
            : activeTab === '교재관리' && contentMode === '문제관리'
              ? '📋 상세 정보'
              : activeTab === '설정' && settingMenu === '블록 관리'
                ? '블록 목록'
              : activeTab === '설정' && settingMenu === '문제 유형'
                ? '문제 유형'
              : activeTab === '설정' && settingMenu === '프롬프트'
                ? '프롬프트 목록'
              : activeTab === '설정' && settingMenu === '데이터 유형'
                ? '데이터 유형 목록'
                  : '확장 기능'
        }
      >
        {/* 설정 - 블록 관리 목록 */}
        {activeTab === '설정' && settingMenu === '블록 관리' && (
          <BlockList
            blocks={blocks}
            isLoading={isLoadingBlocks}
            selectedId={selectedBlock?.id || null}
            onSelect={(block) => {
              setSelectedBlock(block)
              setIsEditingBlock(false)
            }}
            onAdd={() => {
              setSelectedBlock(null)
              setIsEditingBlock(true)
            }}
            onDelete={handleDeleteBlock}
          />
        )}

        {/* 설정 - 프롬프트 목록 */}
        {activeTab === '설정' && settingMenu === '프롬프트' && (
          <PromptList
            prompts={prompts}
            selectedPromptId={selectedPrompt?.id || null}
            onSelectPrompt={(prompt) => {
              setSelectedPrompt(prompt)
              setIsEditingPrompt(false)
              setNewPromptIsQuestionType(null)
            }}
            onAddOneClick={() => {
              setSelectedPrompt(null)
              setIsEditingPrompt(true)
              setNewPromptIsQuestionType(true)  // 원큐용
            }}
            onAddSlot={() => {
              setSelectedPrompt(null)
              setIsEditingPrompt(true)
              setNewPromptIsQuestionType(false)  // 슬롯용
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

        {/* 설정 - 문제 유형 (새 4단계 위자드 - RightPanel은 간소화) */}
        {activeTab === '설정' && settingMenu === '문제 유형' && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              좌측에서 문제 유형 목록을 확인하고 관리할 수 있습니다.
            </p>
            <div className="text-xs text-muted-foreground space-y-1 bg-muted p-3 rounded-md">
              <p className="font-medium mb-2">출력물 구성</p>
              <p>📄 학생용 (문제지)</p>
              <p>📄 정답용 (정답지)</p>
              <p>📄 교사용 (해설지)</p>
            </div>
          </div>
        )}

        {/* 교재관리 - 문장 분리 패널 */}
        {isSheetImportMode && <SplitDetailPanel />}

        {/* 교재관리 - 문제관리 모드: 선택 항목 요약 */}
        {activeTab === '교재관리' && contentMode === '문제관리' && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-3">선택된 교재</h4>
              {selectedTextbookIdsForManage.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  좌측 트리에서 교재를 선택해주세요
                </p>
              ) : (
                <div className="space-y-2">
                  <Badge variant="secondary" className="text-xs">
                    📚 {selectedTextbookIdsForManage.length}개 교재 선택
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    필터는 중앙 패널에서 조정할 수 있습니다
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 기본 메시지 */}
        {!isSheetImportMode && activeTab !== '설정' && 
         !(activeTab === '교재관리' && contentMode === '문제관리') && (
          <p className="text-muted-foreground text-sm">현재 작업과 관련된 확장 기능이 여기에 표시됩니다.</p>
        )}
      </RightPanel>
    </div>
  )

  // 교재관리 - 문장분리 모드일 때 SheetImportProvider로 감싸기
  if (isSheetImportMode) {
    return <SheetImportProvider>{mainLayout}</SheetImportProvider>
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
