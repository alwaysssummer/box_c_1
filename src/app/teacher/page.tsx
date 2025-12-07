'use client'

import { useState, useCallback, useEffect, useMemo, useLayoutEffect, useRef } from 'react'
import { 
  Book, FileText, ChevronRight, RefreshCw, Printer, Download,
  Bookmark, Clock, Settings, Save, Trash2, FolderOpen, Globe, Star, Plus, Pencil, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { convertToTreeNodes } from '@/lib/tree-utils'
import type { TreeNode, GroupWithTextbooks } from '@/types'
import { QuestionRenderer, QuestionData, QuestionLayout, RenderMode } from '@/components/features/question'
import type { ChoiceMarker } from '@/lib/slot-mapper'

// ============ 타입 정의 ============

interface GeneratedQuestion {
  id: string
  instruction: string
  body: string
  choices: string | null
  answer: string
  explanation: string | null
  question_type_id: string
  question_type_name: string
  passage_id: string
  passage_name: string
  status: string
  created_at: string
  // 레이아웃 정보 (question_types에서)
  choice_layout?: 'vertical' | 'horizontal' | 'grid2'
  choice_marker?: ChoiceMarker
}

interface QuestionTypeGroup {
  name: string
  types: {
    id: string
    name: string
    count: number
  }[]
}

// 나의 교재
interface MyTextbook {
  id: string
  name: string
  passageIds: string[]
  createdAt: string
  updatedAt?: string
}

type OutputMode = 'question' | 'question_answer' | 'question_answer_explanation' | 'answer_only'
type DensityMode = 'compact' | 'normal' | 'spacious'

// A4 페이지 설정 (픽셀 기준, 96dpi)
const A4_PAGE_CONFIG = {
  // A4 높이 297mm - 상하 여백 30mm = 267mm ≈ 1009px
  contentHeight: 1009,
  // 밀도별 기본 문제 높이 예상치 조정
  densityMultiplier: {
    compact: 0.85,
    normal: 1,
    spacious: 1.2,
  }
}

// 측정된 높이로 페이지 분할 (100% 정확)
function paginateByMeasuredHeights(
  questions: GeneratedQuestion[], 
  heights: number[]
): GeneratedQuestion[][] {
  if (heights.length === 0 || heights.length !== questions.length) {
    // 높이 측정 전에는 빈 배열 반환
    return []
  }
  
  const pages: GeneratedQuestion[][] = []
  let currentPage: GeneratedQuestion[] = []
  let currentHeight = 0
  const maxHeight = A4_PAGE_CONFIG.contentHeight
  
  questions.forEach((question, idx) => {
    const questionHeight = heights[idx] || 200 // 기본값
    
    if (currentHeight + questionHeight > maxHeight && currentPage.length > 0) {
      // 현재 페이지 완료, 새 페이지 시작
      pages.push(currentPage)
      currentPage = [question]
      currentHeight = questionHeight
    } else {
      // 현재 페이지에 추가
      currentPage.push(question)
      currentHeight += questionHeight
    }
  })
  
  // 마지막 페이지 추가
  if (currentPage.length > 0) {
    pages.push(currentPage)
  }
  
  return pages
}

// OutputMode를 QuestionRenderer의 옵션으로 변환
function getRendererOptions(outputMode: OutputMode): { showAnswer: boolean; showExplanation: boolean; mode: RenderMode } {
  switch (outputMode) {
    case 'question':
      return { showAnswer: false, showExplanation: false, mode: 'student' }
    case 'question_answer':
      return { showAnswer: true, showExplanation: false, mode: 'preview' }
    case 'question_answer_explanation':
      return { showAnswer: true, showExplanation: true, mode: 'preview' }
    case 'answer_only':
      return { showAnswer: true, showExplanation: false, mode: 'answer' }
    default:
      return { showAnswer: false, showExplanation: false, mode: 'student' }
  }
}
type LibraryTab = 'all' | 'my'
type ContentTab = 'textbook' | 'questionType'

// 나의 자료실 모드
type MyLibraryMode = 'list' | 'create' | 'edit'

// ============ 하위 모든 지문 ID 추출 함수 ============

function getAllPassageIds(node: TreeNode): string[] {
  if (node.type === 'passage') {
    return [node.id]
  }
  if (!node.children) return []
  return node.children.flatMap(child => getAllPassageIds(child))
}

// ============ 읽기 전용 트리 노드 ============

function ReadOnlyTreeNode({
  node,
  depth,
  expandedIds,
  selectedPassageIds,
  onToggleExpand,
  onTogglePassage,
  onToggleMultiplePassages,
  showCheckbox = true,
}: {
  node: TreeNode
  depth: number
  expandedIds: Set<string>
  selectedPassageIds: Set<string>
  onToggleExpand: (id: string) => void
  onTogglePassage: (passageId: string) => void
  onToggleMultiplePassages: (passageIds: string[]) => void
  showCheckbox?: boolean
}) {
  const hasChildren = node.children && node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  
  const allDescendantPassageIds = getAllPassageIds(node)
  const isPassageSelected = node.type === 'passage' && selectedPassageIds.has(node.id)
  const allSelected = allDescendantPassageIds.length > 0 && allDescendantPassageIds.every(id => selectedPassageIds.has(id))
  const someSelected = allDescendantPassageIds.some(id => selectedPassageIds.has(id))

  const iconMap = {
    group: <Book className="w-4 h-4 text-blue-600" />,
    textbook: <Book className="w-4 h-4 text-green-600" />,
    unit: <FileText className="w-4 h-4 text-orange-500" />,
    passage: <FileText className="w-4 h-4 text-purple-600" />,
  }

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.type === 'passage') {
      onTogglePassage(node.id)
    } else {
      onToggleMultiplePassages(allDescendantPassageIds)
    }
  }

  const handleRowClick = () => {
    if (hasChildren) {
      onToggleExpand(node.id)
    } else if (node.type === 'passage' && showCheckbox) {
      onTogglePassage(node.id)
    }
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer text-sm',
          'hover:bg-accent/50 transition-colors',
          (isPassageSelected || allSelected) && 'bg-blue-50'
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleRowClick}
      >
        {showCheckbox && (
          <input
            type="checkbox"
            checked={node.type === 'passage' ? isPassageSelected : allSelected}
            ref={(el) => {
              if (el && node.type !== 'passage') {
                el.indeterminate = someSelected && !allSelected
              }
            }}
            onChange={() => {}}
            onClick={handleCheckboxClick}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 mr-1 flex-shrink-0"
          />
        )}
        
        {hasChildren ? (
          <ChevronRight
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0',
              isExpanded && 'rotate-90'
            )}
          />
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        
        {iconMap[node.type]}
        <span className="truncate text-xs">{node.name}</span>
        
        {node.type !== 'passage' && allDescendantPassageIds.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">
            {allDescendantPassageIds.length}
          </span>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <ReadOnlyTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedPassageIds={selectedPassageIds}
              onToggleExpand={onToggleExpand}
              onTogglePassage={onTogglePassage}
              onToggleMultiplePassages={onToggleMultiplePassages}
              showCheckbox={showCheckbox}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============ 유형 트리 노드 ============

function QuestionTypeTreeNode({
  group,
  expandedGroups,
  selectedTypeIds,
  onToggleExpand,
  onToggleType,
  onToggleGroup,
}: {
  group: QuestionTypeGroup
  expandedGroups: Set<string>
  selectedTypeIds: Set<string>
  onToggleExpand: (name: string) => void
  onToggleType: (typeId: string) => void
  onToggleGroup: (groupName: string, typeIds: string[]) => void
}) {
  const isExpanded = expandedGroups.has(group.name)
  const availableTypes = group.types.filter(t => t.count > 0)
  const availableTypeIds = availableTypes.map(t => t.id)
  const allSelected = availableTypeIds.length > 0 && availableTypeIds.every(id => selectedTypeIds.has(id))
  const someSelected = availableTypeIds.some(id => selectedTypeIds.has(id))
  const totalCount = group.types.reduce((sum, t) => sum + t.count, 0)

  return (
    <div className="mb-1">
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer text-sm',
          'hover:bg-accent/50 transition-colors',
          allSelected && 'bg-blue-50'
        )}
        onClick={() => onToggleExpand(group.name)}
      >
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected
          }}
          onChange={(e) => {
            e.stopPropagation()
            onToggleGroup(group.name, availableTypeIds)
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 mr-1"
          disabled={availableTypeIds.length === 0}
        />
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
        <span className="font-medium text-xs">{group.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">({totalCount})</span>
      </div>
      
      {isExpanded && (
        <div className="ml-6 space-y-0.5">
          {group.types.map((type) => (
            <div
              key={type.id}
              className={cn(
                'flex items-center gap-2 py-1 px-2 rounded text-xs cursor-pointer',
                'hover:bg-accent/30 transition-colors',
                type.count === 0 && 'opacity-40 cursor-not-allowed',
                selectedTypeIds.has(type.id) && 'bg-blue-50'
              )}
              onClick={() => type.count > 0 && onToggleType(type.id)}
            >
              <input
                type="checkbox"
                checked={selectedTypeIds.has(type.id)}
                onChange={() => {}}
                disabled={type.count === 0}
                className="w-3 h-3 rounded border-gray-300 text-blue-600"
              />
              <span>{type.name}</span>
              <span className="text-muted-foreground ml-auto">({type.count})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ 메인 컴포넌트 ============

export default function TeacherPage() {
  // 1단계 탭
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('all')
  // 2단계 탭
  const [contentTab, setContentTab] = useState<ContentTab>('textbook')
  
  // 교재 트리 상태
  const [groups, setGroups] = useState<GroupWithTextbooks[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedPassageIds, setSelectedPassageIds] = useState<Set<string>>(new Set())

  // 유형 선택 상태
  const [questionTypeGroups, setQuestionTypeGroups] = useState<QuestionTypeGroup[]>([])
  const [expandedTypeGroups, setExpandedTypeGroups] = useState<Set<string>>(new Set())
  const [selectedTypeIds, setSelectedTypeIds] = useState<Set<string>>(new Set())
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)

  // 문제 데이터
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])

  // 출력 옵션
  const [outputMode, setOutputMode] = useState<OutputMode>('question')
  const [density, setDensity] = useState<DensityMode>('normal')

  // 100% 정확한 페이지 분할을 위한 높이 측정
  const measureContainerRef = useRef<HTMLDivElement>(null)
  const [measuredHeights, setMeasuredHeights] = useState<number[]>([])
  const [isMeasuring, setIsMeasuring] = useState(false)

  // 나의 교재 상태
  const [myTextbooks, setMyTextbooks] = useState<MyTextbook[]>([])
  const [selectedTextbookId, setSelectedTextbookId] = useState<string | null>(null)
  
  // 나의 자료실 모드: list(목록), create(생성), edit(편집)
  const [myLibraryMode, setMyLibraryMode] = useState<MyLibraryMode>('list')
  const [editingTextbookId, setEditingTextbookId] = useState<string | null>(null)
  const [newTextbookName, setNewTextbookName] = useState('')
  
  // 나의 자료실에서 교재 생성/편집용 임시 선택
  const [tempSelectedPassageIds, setTempSelectedPassageIds] = useState<Set<string>>(new Set())

  // ============ localStorage에서 나의 교재 로드 ============

  useEffect(() => {
    const saved = localStorage.getItem('teacher_my_textbooks')
    if (saved) {
      try {
        setMyTextbooks(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse my textbooks:', e)
      }
    }
  }, [])

  const saveMyTextbooks = (textbooks: MyTextbook[]) => {
    localStorage.setItem('teacher_my_textbooks', JSON.stringify(textbooks))
    setMyTextbooks(textbooks)
  }

  // ============ 데이터 로드 ============

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoadingGroups(true)
      const response = await fetch('/api/groups')
      if (!response.ok) throw new Error('Failed to fetch groups')
      const data = await response.json()
      
      if (Array.isArray(data) && data.length > 0) {
        const groupsWithTextbooks = await Promise.all(
          data.map(async (group: GroupWithTextbooks) => {
            const textbooksRes = await fetch(`/api/textbooks?groupId=${group.id}`)
            const textbooks = textbooksRes.ok ? await textbooksRes.json() : []
            return { ...group, textbooks }
          })
        )
        setGroups(groupsWithTextbooks)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setIsLoadingGroups(false)
    }
  }, [])

  // 선택된 지문들의 문제 유형 통계 로드
  const fetchQuestionTypeStats = useCallback(async (passageIds: Set<string>) => {
    if (passageIds.size === 0) {
      setQuestionTypeGroups([])
      setQuestions([])
      return
    }

    try {
      setIsLoadingTypes(true)
      
      const passageIdArray = Array.from(passageIds)
      const allQuestions: GeneratedQuestion[] = []
      
      for (const passageId of passageIdArray) {
        const response = await fetch(`/api/passages/${passageId}/generated`)
        if (response.ok) {
          const data = await response.json()
          if (data.generatedQuestions) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            allQuestions.push(...data.generatedQuestions.map((q: any) => ({
              id: q.id,
              instruction: q.instruction,
              body: q.body,
              choices: q.choices,
              answer: q.answer,
              explanation: q.explanation,
              question_type_id: q.question_type_id,
              question_type_name: q.question_type?.name || '',
              passage_id: passageId,
              passage_name: data.passage?.name || '',
              status: q.status,
              created_at: q.created_at,
              // 레이아웃 정보 추가 (question_types에서)
              choice_layout: q.question_type?.choice_layout || 'vertical',
              choice_marker: q.question_type?.choice_marker || 'circle',
            })))
          }
        }
      }

      // 문제 유형별로 그룹화
      const typeCountMap = new Map<string, { id: string; name: string; count: number }>()
      allQuestions.forEach(q => {
        if (q.status === 'completed') {
          const existing = typeCountMap.get(q.question_type_id)
          if (existing) {
            existing.count++
          } else {
            typeCountMap.set(q.question_type_id, {
              id: q.question_type_id,
              name: q.question_type_name,
              count: 1
            })
          }
        }
      })

      // 유형 그룹 구성
      const groupDefs = [
        { name: '기초 단어', keywords: ['단어장', '단어시험', '단어빈칸'] },
        { name: '문장분석/연습', keywords: ['한줄영어', '한줄해석', '좌우한줄', '완성영문', '문장분석', '문장연습'] },
        { name: '서술형&영작', keywords: ['서술형', '어구배열', '조건영작', '부분영작'] },
        { name: '실전', keywords: ['제목', '주제', '요지', '사실일치', '문장순서', '문장삽입', '빈칸추론', '어법추론', '어휘추론', '무관한문장', '함의추론', '요약문'] },
        { name: '어법 연습', keywords: ['어법분석', '어법선택', '어법수정'] },
        { name: '어휘 연습', keywords: ['어휘선택', '어휘수정', '어휘빈칸'] },
      ]

      const typesByGroup = new Map<string, { id: string; name: string; count: number }[]>()
      groupDefs.forEach(g => typesByGroup.set(g.name, []))
      typesByGroup.set('기타', [])

      typeCountMap.forEach(type => {
        let assigned = false
        const typeName = type.name || ''
        for (const groupDef of groupDefs) {
          if (groupDef.keywords.some(kw => typeName.includes(kw))) {
            typesByGroup.get(groupDef.name)!.push(type)
            assigned = true
            break
          }
        }
        if (!assigned) {
          typesByGroup.get('기타')!.push(type)
        }
      })

      const questionGroups: QuestionTypeGroup[] = []
      groupDefs.forEach(g => {
        const types = typesByGroup.get(g.name)!
        if (types.length > 0) {
          questionGroups.push({ name: g.name, types })
        }
      })
      const etcTypes = typesByGroup.get('기타')!
      if (etcTypes.length > 0) {
        questionGroups.push({ name: '기타', types: etcTypes })
      }

      setQuestionTypeGroups(questionGroups)
      setQuestions(allQuestions)
      
    } catch (error) {
      console.error('Error fetching question type stats:', error)
    } finally {
      setIsLoadingTypes(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    fetchQuestionTypeStats(selectedPassageIds)
  }, [selectedPassageIds, fetchQuestionTypeStats])

  // ============ 이벤트 핸들러 ============

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleTogglePassage = (passageId: string) => {
    setSelectedPassageIds(prev => {
      const next = new Set(prev)
      if (next.has(passageId)) next.delete(passageId)
      else next.add(passageId)
      return next
    })
    setSelectedTypeIds(new Set())
  }

  const handleToggleMultiplePassages = (passageIds: string[]) => {
    setSelectedPassageIds(prev => {
      const allSelected = passageIds.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        passageIds.forEach(id => next.delete(id))
      } else {
        passageIds.forEach(id => next.add(id))
      }
      return next
    })
    setSelectedTypeIds(new Set())
  }

  // 나의 자료실용 임시 선택 핸들러
  const handleTempTogglePassage = (passageId: string) => {
    setTempSelectedPassageIds(prev => {
      const next = new Set(prev)
      if (next.has(passageId)) next.delete(passageId)
      else next.add(passageId)
      return next
    })
  }

  const handleTempToggleMultiplePassages = (passageIds: string[]) => {
    setTempSelectedPassageIds(prev => {
      const allSelected = passageIds.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        passageIds.forEach(id => next.delete(id))
      } else {
        passageIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const handleToggleTypeGroup = (groupName: string) => {
    setExpandedTypeGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) next.delete(groupName)
      else next.add(groupName)
      return next
    })
  }

  const handleToggleType = (typeId: string) => {
    setSelectedTypeIds(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) next.delete(typeId)
      else next.add(typeId)
      return next
    })
  }

  const handleToggleTypeGroupSelection = (groupName: string, typeIds: string[]) => {
    setSelectedTypeIds(prev => {
      const allSelected = typeIds.every(id => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        typeIds.forEach(id => next.delete(id))
      } else {
        typeIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  // ============ 나의 교재 핸들러 ============

  // 교재 생성 시작
  const handleStartCreateTextbook = () => {
    setMyLibraryMode('create')
    setNewTextbookName('')
    setTempSelectedPassageIds(new Set())
  }

  // 교재 생성 저장
  const handleSaveNewTextbook = () => {
    if (!newTextbookName.trim() || tempSelectedPassageIds.size === 0) return
    
    const newTextbook: MyTextbook = {
      id: `textbook_${Date.now()}`,
      name: newTextbookName.trim(),
      passageIds: Array.from(tempSelectedPassageIds),
      createdAt: new Date().toISOString(),
    }
    
    saveMyTextbooks([...myTextbooks, newTextbook])
    setMyLibraryMode('list')
    setNewTextbookName('')
    setTempSelectedPassageIds(new Set())
  }

  // 교재 편집 시작
  const handleStartEditTextbook = (textbook: MyTextbook) => {
    setMyLibraryMode('edit')
    setEditingTextbookId(textbook.id)
    setNewTextbookName(textbook.name)
    setTempSelectedPassageIds(new Set(textbook.passageIds))
  }

  // 교재 편집 저장
  const handleSaveEditedTextbook = () => {
    if (!editingTextbookId || !newTextbookName.trim()) return
    
    const updatedTextbooks = myTextbooks.map(tb => {
      if (tb.id === editingTextbookId) {
        return {
          ...tb,
          name: newTextbookName.trim(),
          passageIds: Array.from(tempSelectedPassageIds),
          updatedAt: new Date().toISOString(),
        }
      }
      return tb
    })
    
    saveMyTextbooks(updatedTextbooks)
    setMyLibraryMode('list')
    setEditingTextbookId(null)
    setNewTextbookName('')
    setTempSelectedPassageIds(new Set())
  }

  // 교재 삭제
  const handleDeleteTextbook = (textbookId: string) => {
    if (!confirm('이 교재를 삭제하시겠습니까?')) return
    saveMyTextbooks(myTextbooks.filter(tb => tb.id !== textbookId))
    if (selectedTextbookId === textbookId) {
      setSelectedTextbookId(null)
      setSelectedPassageIds(new Set())
    }
  }

  // 교재 선택 (유형 선택으로 이동)
  const handleSelectTextbook = (textbook: MyTextbook) => {
    setSelectedTextbookId(textbook.id)
    setSelectedPassageIds(new Set(textbook.passageIds))
    setSelectedTypeIds(new Set())
    setContentTab('questionType')
  }

  // 생성/편집 취소
  const handleCancelCreateOrEdit = () => {
    setMyLibraryMode('list')
    setEditingTextbookId(null)
    setNewTextbookName('')
    setTempSelectedPassageIds(new Set())
  }

  // ============ 미리보기 데이터 ============

  const previewQuestions = useMemo(() => {
    if (selectedTypeIds.size === 0) return []
    return questions.filter(q => 
      q.status === 'completed' && 
      selectedTypeIds.has(q.question_type_id) &&
      (q.instruction || q.body || q.choices) // 내용이 있는 문제만 표시
    )
  }, [questions, selectedTypeIds])

  // previewQuestions 변경 시 측정 시작
  useEffect(() => {
    if (previewQuestions.length > 0) {
      setIsMeasuring(true)
      setMeasuredHeights([])
    } else {
      setIsMeasuring(false)
      setMeasuredHeights([])
    }
  }, [previewQuestions, density])

  // 측정용 컨테이너 렌더링 후 높이 측정
  useLayoutEffect(() => {
    if (isMeasuring && measureContainerRef.current) {
      const container = measureContainerRef.current
      const items = container.querySelectorAll('[data-measure-item]')
      
      if (items.length === previewQuestions.length) {
        const heights = Array.from(items).map(el => (el as HTMLElement).offsetHeight)
        setMeasuredHeights(heights)
        setIsMeasuring(false)
      }
    }
  }, [isMeasuring, previewQuestions.length])

  // 페이지별로 문제 그룹화 (측정된 높이 사용)
  const paginatedQuestions = useMemo(() => {
    if (measuredHeights.length !== previewQuestions.length) {
      return [] // 측정 중에는 빈 배열
    }
    return paginateByMeasuredHeights(previewQuestions, measuredHeights)
  }, [previewQuestions, measuredHeights])

  const stats = useMemo(() => {
    const totalQuestions = questions.filter(q => q.status === 'completed').length
    const selectedQuestions = previewQuestions.length
    return { totalQuestions, selectedQuestions }
  }, [questions, previewQuestions])

  const treeNodes = convertToTreeNodes(groups)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="h-screen flex bg-slate-50 print:block print:h-auto">
      {/* ========== 좌측 2열 선택 패널 (전체 자료실) ========== */}
      {libraryTab === 'all' && (
        <div className="flex no-print">
          {/* 1열: 교재 선택 */}
          <div className="w-[220px] bg-white border-r border-slate-200 flex flex-col">
            <div className="p-2 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-white">📚 교재 선택</h2>
                <button 
                  onClick={() => setLibraryTab('my')}
                  className="text-[10px] text-blue-200 hover:text-white"
                >
                  나의자료실 →
                </button>
              </div>
              <p className="text-[10px] text-blue-200 mt-0.5">
                {selectedPassageIds.size > 0 ? `${selectedPassageIds.size}개 지문` : '지문 선택'}
              </p>
            </div>
            
            <div className="flex-1 overflow-auto p-1.5">
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] text-slate-400">교재 트리</span>
                <Button variant="ghost" size="sm" onClick={fetchGroups} className="h-5 w-5 p-0">
                  <RefreshCw className="w-2.5 h-2.5" />
                </Button>
              </div>
              {isLoadingGroups ? (
                <div className="py-4 text-center text-[10px] text-slate-400">로딩...</div>
              ) : treeNodes.length > 0 ? (
                <div className="space-y-0.5 text-[11px]">
                  {treeNodes.map((node) => (
                    <ReadOnlyTreeNode
                      key={node.id}
                      node={node}
                      depth={0}
                      expandedIds={expandedIds}
                      selectedPassageIds={selectedPassageIds}
                      onToggleExpand={handleToggleExpand}
                      onTogglePassage={handleTogglePassage}
                      onToggleMultiplePassages={handleToggleMultiplePassages}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-[10px] text-slate-400">교재 없음</div>
              )}
            </div>
          </div>

          {/* 2열: 유형 선택 */}
          <div className="w-[180px] bg-white border-r border-slate-200 flex flex-col">
            <div className="p-2 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-indigo-500">
              <h2 className="text-xs font-bold text-white">🏷 유형 선택</h2>
              <p className="text-[10px] text-indigo-200 mt-0.5">
                {selectedTypeIds.size > 0 ? `${selectedTypeIds.size}개 유형` : '유형 선택'}
              </p>
            </div>
            
            {selectedPassageIds.size > 0 && (
              <div className="px-2 py-1 bg-blue-50 border-b text-[10px] text-blue-600">
                {selectedPassageIds.size}개 지문 기준
              </div>
            )}
            
            <div className="flex-1 overflow-auto p-1.5">
              {selectedPassageIds.size === 0 ? (
                <div className="py-4 text-center text-[10px] text-slate-400">
                  ← 지문 먼저 선택
                </div>
              ) : isLoadingTypes ? (
                <div className="py-4 text-center text-[10px] text-slate-400">로딩...</div>
              ) : questionTypeGroups.length > 0 ? (
                <div className="space-y-0.5 text-[11px]">
                  {questionTypeGroups.map((group) => (
                    <QuestionTypeTreeNode
                      key={group.name}
                      group={group}
                      expandedGroups={expandedTypeGroups}
                      selectedTypeIds={selectedTypeIds}
                      onToggleExpand={handleToggleTypeGroup}
                      onToggleType={handleToggleType}
                      onToggleGroup={handleToggleTypeGroupSelection}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-[10px] text-slate-400">문제 없음</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== 나의 자료실 (단일 패널) ========== */}
      {libraryTab === 'my' && (
        <div className="w-[280px] bg-white border-r border-slate-200 flex flex-col no-print">
          <div className="p-2 border-b border-slate-200 bg-gradient-to-r from-amber-500 to-orange-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white">⭐ 나의 자료실</h2>
              <button 
                onClick={() => setLibraryTab('all')}
                className="text-[10px] text-amber-200 hover:text-white"
              >
                ← 전체자료실
              </button>
            </div>
          </div>

          {/* 나의 자료실 콘텐츠 */}
          <div className="flex-1 overflow-auto p-2">

          {/* ========== 나의 자료실 - 목록 모드 ========== */}
          {myLibraryMode === 'list' && (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-slate-500">
                  📕 나의 교재: {myTextbooks.length}개
                </span>
              </div>

              {/* 나의 교재 목록 */}
              {myTextbooks.length > 0 ? (
                <div className="space-y-1 mb-3">
                  {myTextbooks.map((tb) => (
                    <div
                      key={tb.id}
                      className={cn(
                        'p-2 rounded-lg border transition-all',
                        'hover:border-blue-300 hover:bg-blue-50/50',
                        selectedTextbookId === tb.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-white'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex items-center gap-2 cursor-pointer flex-1"
                          onClick={() => handleSelectTextbook(tb)}
                        >
                          <FolderOpen className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-medium">{tb.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartEditTextbook(tb); }}
                            className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                            title="범위 편집"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTextbook(tb.id); }}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div 
                        className="text-xs text-slate-400 mt-1 ml-6 cursor-pointer"
                        onClick={() => handleSelectTextbook(tb)}
                      >
                        {tb.passageIds.length}개 지문 • {new Date(tb.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <FolderOpen className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">나의 교재가 없습니다</p>
                </div>
              )}

              {/* 유형 선택 (교재 선택 후) */}
              {selectedTextbookId && (
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-medium text-slate-600">
                      🏷 유형 선택
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedTypeIds.size}개 선택
                    </span>
                  </div>
                  
                  {isLoadingTypes ? (
                    <div className="py-4 text-center text-xs text-slate-400">로딩 중...</div>
                  ) : questionTypeGroups.length > 0 ? (
                    <div className="space-y-0.5">
                      {questionTypeGroups.map((group) => (
                        <QuestionTypeTreeNode
                          key={group.name}
                          group={group}
                          expandedGroups={expandedTypeGroups}
                          selectedTypeIds={selectedTypeIds}
                          onToggleExpand={handleToggleTypeGroup}
                          onToggleType={handleToggleType}
                          onToggleGroup={handleToggleTypeGroupSelection}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400">
                      생성된 문제가 없습니다
                    </div>
                  )}
                </div>
              )}

              {/* 새 교재 만들기 버튼 */}
              <div className="mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleStartCreateTextbook}
                  className="w-full h-8 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  새 교재 만들기
                </Button>
              </div>
            </>
          )}

          {/* ========== 나의 자료실 - 생성/편집 모드 ========== */}
          {(myLibraryMode === 'create' || myLibraryMode === 'edit') && (
            <>
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-medium text-slate-700">
                  {myLibraryMode === 'create' ? '📕 새 교재 만들기' : '✏️ 교재 편집'}
                </span>
                <button
                  onClick={handleCancelCreateOrEdit}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 교재 이름 입력 */}
              <div className="mb-3">
                <input
                  type="text"
                  value={newTextbookName}
                  onChange={(e) => setNewTextbookName(e.target.value)}
                  placeholder="교재 이름 입력"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded"
                  autoFocus
                />
              </div>

              {/* 범위 선택 안내 */}
              <div className="mb-2 px-1">
                <span className="text-xs text-slate-500">
                  📚 범위 선택: {tempSelectedPassageIds.size}개 지문
                </span>
              </div>

              {/* 전체 자료실 트리 (범위 선택용) */}
              {isLoadingGroups ? (
                <div className="py-8 text-center text-xs text-slate-400">로딩 중...</div>
              ) : treeNodes.length > 0 ? (
                <div className="space-y-0.5 border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-[300px] overflow-auto">
                  {treeNodes.map((node) => (
                    <ReadOnlyTreeNode
                      key={node.id}
                      node={node}
                      depth={0}
                      expandedIds={expandedIds}
                      selectedPassageIds={tempSelectedPassageIds}
                      onToggleExpand={handleToggleExpand}
                      onTogglePassage={handleTempTogglePassage}
                      onToggleMultiplePassages={handleTempToggleMultiplePassages}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  등록된 교재가 없습니다
                </div>
              )}
            </>
          )}
        </div>

        {/* 하단: 생성/편집 저장 버튼 */}
        {(myLibraryMode === 'create' || myLibraryMode === 'edit') && (
          <div className="p-2 border-t border-slate-200 bg-slate-50">
            <div className="flex gap-1">
              <Button 
                size="sm" 
                onClick={myLibraryMode === 'create' ? handleSaveNewTextbook : handleSaveEditedTextbook}
                disabled={!newTextbookName.trim() || tempSelectedPassageIds.size === 0}
                className="flex-1 h-8 text-xs"
              >
                <Save className="w-3 h-3 mr-1" />
                {myLibraryMode === 'create' ? '교재 저장' : '변경 저장'}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleCancelCreateOrEdit}
                className="h-8 text-xs"
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {/* 하단 요약 */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">전체 문제:</span>
              <span className="font-medium">{stats.totalQuestions}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">선택된 문제:</span>
              <span className="font-medium text-blue-600">{stats.selectedQuestions}개</span>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ========== 중앙 패널: 실시간 미리보기 ========== */}
      <div className="flex-1 flex flex-col print:block">
        {/* 상단 바 (인쇄 시 숨김) */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 no-print">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700">
              📄 미리보기
            </span>
            {previewQuestions.length > 0 && (
              <span className="text-xs text-slate-500">
                {previewQuestions.length}개 문제
              </span>
            )}
          </div>
          
          {/* 출력 옵션 */}
          <div className="flex items-center gap-2">
            {/* 밀도 옵션 */}
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value as DensityMode)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
              title="출력 밀도"
            >
              <option value="compact">빽빽하게</option>
              <option value="normal">기본</option>
              <option value="spacious">여유있게</option>
            </select>
            
            {/* 출력 모드 */}
            <select
              value={outputMode}
              onChange={(e) => setOutputMode(e.target.value as OutputMode)}
              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
            >
              <option value="question">문제만</option>
              <option value="question_answer">문제 + 정답</option>
              <option value="question_answer_explanation">문제 + 정답 + 해설</option>
              <option value="answer_only">정답만</option>
            </select>
            
            {/* 페이지 수 표시 */}
            {paginatedQuestions.length > 0 && (
              <span className="text-xs text-slate-500 ml-1">
                {paginatedQuestions.length}페이지
              </span>
            )}
            
            <Button size="sm" variant="outline" onClick={handlePrint} className="h-7 text-xs">
              <Printer className="w-3 h-3 mr-1" />
              출력
            </Button>
            <Button size="sm" className="h-7 text-xs">
              <Download className="w-3 h-3 mr-1" />
              PDF
            </Button>
          </div>
        </div>

        {/* 측정용 숨겨진 컨테이너 (100% 정확한 페이지 분할을 위해) */}
        {isMeasuring && previewQuestions.length > 0 && (
          <div 
            ref={measureContainerRef}
            className={`fixed left-[-9999px] top-0 w-[170mm] density-${density}`}
            style={{ visibility: 'hidden' }}
          >
            {previewQuestions.map((q, idx) => {
              const rendererOpts = getRendererOptions(outputMode)
              const questionData: QuestionData = {
                instruction: q.instruction,
                body: q.body,
                choices: q.choices,
                answer: q.answer,
                explanation: q.explanation,
              }
              const layout: QuestionLayout = {
                choiceLayout: q.choice_layout || 'vertical',
                choiceMarker: q.choice_marker || 'circle',
                questionGroup: 'practical',
              }
              
              return (
                <div key={q.id} data-measure-item className="pb-4 mb-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {q.question_type_name}
                    </span>
                  </div>
                  <QuestionRenderer
                    question={questionData}
                    layout={layout}
                    mode={rendererOpts.mode}
                    showAnswer={rendererOpts.showAnswer}
                    showExplanation={rendererOpts.showExplanation}
                    questionNumber={idx + 1}
                  />
                </div>
              )
            })}
          </div>
        )}

        {/* 미리보기 영역 - A4 페이지 스타일 */}
        <div className={`flex-1 overflow-auto p-4 bg-slate-200 print:p-0 print:bg-white print:overflow-visible print-area density-${density}`}>
          {previewQuestions.length === 0 ? (
            <div className="h-full flex items-center justify-center no-print">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 text-sm">
                  {selectedPassageIds.size === 0 
                    ? '좌측에서 교재/지문을 선택하세요'
                    : selectedTypeIds.size === 0
                      ? '좌측에서 문제 유형을 선택하세요'
                      : '선택된 조건에 맞는 문제가 없습니다'}
                </p>
              </div>
            </div>
          ) : isMeasuring ? (
            /* 측정 중 로딩 표시 */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 mx-auto text-blue-400 mb-3 animate-spin" />
                <p className="text-slate-500 text-sm">페이지 레이아웃 계산 중...</p>
                <p className="text-slate-400 text-xs mt-1">{previewQuestions.length}개 문제 측정</p>
              </div>
            </div>
          ) : outputMode === 'answer_only' ? (
            /* 정답만 모드 - 간단한 정답표 */
            <div className="a4-page" data-page="1">
              <div className="a4-page-content">
                <h2 className="text-lg font-bold mb-4 border-b pb-2">정답표</h2>
                <div className="grid grid-cols-5 gap-2">
                  {previewQuestions.map((q, idx) => (
                    <div key={q.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      <span className="font-medium text-sm">{idx + 1}.</span>
                      <span className="text-blue-600 font-bold">{q.answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* 문제 표시 모드 - A4 페이지별 렌더링 */
            <div className="print-content">
              {paginatedQuestions.map((pageQuestions, pageIdx) => {
                // 이 페이지까지의 누적 문제 수 계산
                const prevQuestionsCount = paginatedQuestions
                  .slice(0, pageIdx)
                  .reduce((sum, page) => sum + page.length, 0)
                
                return (
                  <div 
                    key={pageIdx} 
                    className="a4-page"
                    data-page={`${pageIdx + 1} / ${paginatedQuestions.length}`}
                  >
                    <div className="a4-page-content space-y-4">
                      {pageQuestions.map((q, qIdx) => {
                        const globalIdx = prevQuestionsCount + qIdx
                        const rendererOpts = getRendererOptions(outputMode)
                        
                        const questionData: QuestionData = {
                          instruction: q.instruction,
                          body: q.body,
                          choices: q.choices,
                          answer: q.answer,
                          explanation: q.explanation,
                        }
                        
                        const layout: QuestionLayout = {
                          choiceLayout: q.choice_layout || 'vertical',
                          choiceMarker: q.choice_marker || 'circle',
                          questionGroup: 'practical',
                        }
                        
                        return (
                          <div key={q.id} className="print-question pb-4 border-b border-slate-100 last:border-0">
                            {/* 문제 헤더 */}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                {q.question_type_name}
                              </span>
                              <span className="text-xs text-slate-400">{q.passage_name}</span>
                            </div>
                            
                            {/* QuestionRenderer */}
                            <QuestionRenderer
                              question={questionData}
                              layout={layout}
                              mode={rendererOpts.mode}
                              showAnswer={rendererOpts.showAnswer}
                              showExplanation={rendererOpts.showExplanation}
                              questionNumber={globalIdx + 1}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========== 우측 패널 (인쇄 시 숨김) ========== */}
      <div className="w-[200px] bg-white border-l border-slate-200 flex flex-col no-print">
        <div className="h-12 border-b border-slate-200 flex items-center px-3">
          <span className="text-xs font-medium text-slate-500">🔧 도구</span>
        </div>
        
        <div className="flex-1 p-3">
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 p-2 rounded bg-slate-50">
              <Bookmark className="w-4 h-4" />
              <span>북마크 (예정)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-50">
              <Clock className="w-4 h-4" />
              <span>최근 출력 (예정)</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-50">
              <Settings className="w-4 h-4" />
              <span>출력 설정 (예정)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
