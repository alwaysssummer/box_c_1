'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Loader2, 
  RefreshCw, 
  FileText, 
  AlertCircle,
  BarChart3,
  FolderOpen,
  HelpCircle,
  Search,
  Eye,
  Trash2,
  X,
  Database,
  ChevronDown,
  ChevronUp,
  Book,
  File,
  ChevronRight,
  RotateCcw,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { QuestionPreviewModal } from './QuestionPreviewModal'

// 타입 정의
interface DataTypeInfo {
  id: string
  name: string
  category: string
  stats: {
    total: number
    completed: number
    failed: number
  }
}

interface QuestionTypeInfo {
  id: string
  name: string
  stats: {
    total: number
    completed: number
    failed: number
  }
}

interface PassageInfo {
  id: string
  name: string
  orderIndex: number
  sentenceSplitStatus: string
  sentenceCount: number
  generatedData: Record<string, string>
  generatedQuestions: Record<string, string>
}

interface UnitInfo {
  id: string
  name: string
  orderIndex: number
  passageCount: number
  passages: PassageInfo[]
}

interface TextbookInfo {
  id: string
  name: string
  orderIndex: number
  unitCount: number
  passageCount: number
  units: UnitInfo[]
}

interface GroupInfo {
  id: string
  name: string
  orderIndex: number
  textbookCount: number
  passageCount: number
  textbooks: TextbookInfo[]
}

interface StatusData {
  summary: {
    groups: number
    textbooks: number
    units: number
    passages: number
    sentenceSplit: {
      completed: number
      pending: number
      error: number
    }
  }
  dataTypes: DataTypeInfo[]
  questionTypes: QuestionTypeInfo[]
  hierarchy: GroupInfo[]
}

// 지문 상세 데이터 타입
interface GeneratedDataItem {
  id: string
  passage_id: string
  data_type_id: string
  result: string | Record<string, unknown> | null
  status: string
  model_used: string | null
  confidence: number | null
  response_time: number | null
  error_message: string | null
  created_at: string
  data_type: {
    id: string
    name: string
    category: string
    target: string
  }
}

interface GeneratedQuestionItem {
  id: string
  passage_id: string
  question_type_id: string
  instruction: string | null
  body: string | Record<string, unknown> | null
  choices: string | string[] | Record<string, unknown> | null
  answer: string | Record<string, unknown> | null
  explanation: string | Record<string, unknown> | null
  status: string
  error_message: string | null
  created_at: string
  question_type: {
    id: string
    name: string
    purpose: string
  }
}

interface PassageDetailData {
  passage: {
    id: string
    name: string
    content: string | null
    korean_translation: string | null
    sentence_split_status: string
    sentence_count: number
    unit: {
      id: string
      name: string
      textbook: {
        id: string
        name: string
        group: { id: string; name: string }
      }
    }
  }
  generatedData: GeneratedDataItem[]
  generatedQuestions: GeneratedQuestionItem[]
  allDataTypes: { id: string; name: string; category: string; target: string }[]
  allQuestionTypes: { id: string; name: string; purpose: string }[]
}

// 대시보드 모드
type DashboardMode = 'status' | 'manage'

// 트리에서 선택된 노드 (필터 연동용)
interface SelectedNode {
  type: 'group' | 'textbook' | 'unit' | 'passage'
  id: string
  name: string
  textbookId?: string
}

// 필터 타입
type FilterType = 'all' | 'dataType' | 'questionType'
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed'

interface StatusDashboardProps {
  mode?: DashboardMode
  selectedNode?: SelectedNode | null
  selectedTextbookIds?: string[]
  onTextbookSelectionChange?: (textbookIds: string[]) => void
}

// 선택된 교재들의 지문을 토글 구조로 표시하는 컴포넌트
interface SelectedTextbooksViewProps {
  textbookIds: string[]
  hierarchy: GroupInfo[]
  dataTypes: DataTypeInfo[]
  questionTypes: QuestionTypeInfo[]
  onSelectPassage: (passageId: string) => void
  detailPassageId: string | null
  onRefresh: () => void
  // 필터 조건
  filterType?: FilterType
  selectedTypeId?: string
  statusFilter?: StatusFilter
}

function SelectedTextbooksView({ 
  textbookIds, 
  hierarchy, 
  dataTypes,
  questionTypes,
  onSelectPassage,
  detailPassageId,
  onRefresh,
  filterType = 'all',
  selectedTypeId = 'all',
  statusFilter = 'all'
}: SelectedTextbooksViewProps) {
  // 선택된 교재는 기본으로 펼침
  const [expandedTextbooks, setExpandedTextbooks] = useState<Set<string>>(new Set(textbookIds))
  
  // 모든 단원 ID를 수집하여 기본으로 펼침
  const allUnitIds = useMemo(() => {
    const unitIds: string[] = []
    hierarchy.forEach(group => {
      group.textbooks?.forEach(textbook => {
        if (textbookIds.includes(textbook.id)) {
          textbook.units?.forEach(unit => {
            unitIds.push(unit.id)
          })
        }
      })
    })
    return unitIds
  }, [hierarchy, textbookIds])
  
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(allUnitIds))

  // 체크된 지문 ID 관리
  const [checkedPassageIds, setCheckedPassageIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // 선택된 교재들 찾기
  const selectedTextbooks: { textbook: TextbookInfo; groupName: string }[] = []
  hierarchy.forEach(group => {
    group.textbooks?.forEach(textbook => {
      if (textbookIds.includes(textbook.id)) {
        selectedTextbooks.push({ textbook, groupName: group.name })
      }
    })
  })

  // 지문 필터링 함수
  function isPassageVisible(passage: PassageInfo): boolean {

    // 데이터 유형 필터
    if (filterType === 'dataType') {
      if (selectedTypeId !== 'all') {
        const status = passage.generatedData?.[selectedTypeId]
        // 상태 필터에 따른 처리
        if (statusFilter === 'all') return true  // ⭐ 개선: 모든 지문 표시 (생성 가능 포함)
        if (statusFilter === 'completed') return status === 'completed'
        if (statusFilter === 'pending') return !status || status === 'pending'  // 미생성 포함
        if (statusFilter === 'failed') return status === 'failed' || status === 'error'
        return true
      } else if (statusFilter !== 'all') {
        const dataStatuses = Object.values(passage.generatedData || {})
        if (dataStatuses.length === 0) return statusFilter === 'pending'
        if (statusFilter === 'completed') return dataStatuses.some(s => s === 'completed')
        if (statusFilter === 'failed') return dataStatuses.some(s => s === 'failed' || s === 'error')
        if (statusFilter === 'pending') return dataStatuses.some(s => !s || s === 'pending')
        return true
      }
    }

    // 문제 유형 필터
    if (filterType === 'questionType') {
      if (selectedTypeId !== 'all') {
        const status = passage.generatedQuestions?.[selectedTypeId]
        
        // ⭐ 디버깅 로그
        if (passage.generatedQuestions && Object.keys(passage.generatedQuestions).length > 0) {
          console.log('[Filter] Checking passage:', {
            passageName: passage.name,
            selectedTypeId,
            status,
            allQuestions: passage.generatedQuestions,
            statusFilter,
          })
        }
        
        // 상태 필터에 따른 처리
        if (statusFilter === 'all') return true  // ⭐ 개선: 모든 지문 표시 (생성 가능 포함)
        if (statusFilter === 'completed') return status === 'completed'
        if (statusFilter === 'pending') return !status || status === 'pending'  // 미생성 포함
        if (statusFilter === 'failed') return status === 'failed' || status === 'error'
        return true
      } else if (statusFilter !== 'all') {
        const questionStatuses = Object.values(passage.generatedQuestions || {})
        if (questionStatuses.length === 0) return statusFilter === 'pending'
        if (statusFilter === 'completed') return questionStatuses.some(s => s === 'completed')
        if (statusFilter === 'failed') return questionStatuses.some(s => s === 'failed' || s === 'error')
        if (statusFilter === 'pending') return questionStatuses.some(s => !s || s === 'pending')
        return true
      }
    }

    // 전체 유형 + 상태 필터만 적용 (문장분리 기준)
    if (filterType === 'all' && statusFilter !== 'all') {
      if (statusFilter === 'completed') return passage.sentenceSplitStatus === 'completed'
      if (statusFilter === 'pending') return passage.sentenceSplitStatus !== 'completed' && passage.sentenceSplitStatus !== 'error'
      if (statusFilter === 'failed') return passage.sentenceSplitStatus === 'error'
    }

    return true
  }

  // 필터링된 모든 지문 ID 수집
  const allVisiblePassageIds = useMemo(() => {
    const ids: string[] = []
    
    selectedTextbooks.forEach(({ textbook }) => {
      textbook.units?.forEach(unit => {
        const visible = unit.passages?.filter(p => isPassageVisible(p)) || []
        visible.forEach(p => ids.push(p.id))
      })
    })
    
    return ids
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTextbooks, filterType, selectedTypeId, statusFilter])

  const toggleTextbook = (id: string) => {
    setExpandedTextbooks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 지문 체크 토글
  const togglePassageCheck = (passageId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setCheckedPassageIds(prev => {
      const next = new Set(prev)
      if (next.has(passageId)) next.delete(passageId)
      else next.add(passageId)
      return next
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (checkedPassageIds.size === allVisiblePassageIds.length) {
      setCheckedPassageIds(new Set())
    } else {
      setCheckedPassageIds(new Set(allVisiblePassageIds))
    }
  }

  // 지문의 데이터/문제 생성 현황 계산
  const getPassageStats = (passage: PassageInfo) => {
    const dataCompleted = Object.values(passage.generatedData || {}).filter(s => s === 'completed').length
    const dataTotal = dataTypes.length
    const questionCompleted = Object.values(passage.generatedQuestions || {}).filter(s => s === 'completed').length
    const questionTotal = questionTypes.length
    return { dataCompleted, dataTotal, questionCompleted, questionTotal }
  }

  // 필터가 적용되었는지 확인 (특정 유형이 선택됨)
  const hasTypeFilter = filterType !== 'all' && selectedTypeId !== 'all'
  const isFiltered = filterType !== 'all' || statusFilter !== 'all'

  // 필터링된 지문 수 계산
  const getFilteredPassageCount = (unit: UnitInfo): number => {
    if (!isFiltered) return unit.passages?.length || 0
    return unit.passages?.filter(p => isPassageVisible(p)).length || 0
  }

  // 현재 필터의 유형 이름 가져오기
  const getFilterTypeName = (): string => {
    if (filterType === 'dataType' && selectedTypeId !== 'all') {
      const dt = dataTypes.find(d => d.id === selectedTypeId)
      return dt?.name || '데이터 유형'
    }
    if (filterType === 'questionType' && selectedTypeId !== 'all') {
      const qt = questionTypes.find(q => q.id === selectedTypeId)
      return qt?.name || '문제 유형'
    }
    return ''
  }

  // 전체 삭제 실행
  const executeDeleteAll = async () => {
    if (checkedPassageIds.size === 0) return

    const confirmMsg = `${checkedPassageIds.size}개 지문의 모든 데이터/문제를 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`
    if (!confirm(confirmMsg)) return

    setIsDeleting(true)
    try {
      const passageIds = Array.from(checkedPassageIds)
      
      const response = await fetch('/api/passages/batch-delete-generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageIds,
          deleteType: 'all',
        }),
      })

      if (!response.ok) throw new Error('삭제 실패')

      const result = await response.json()
      toast.success(result.message)
      
      setCheckedPassageIds(new Set())
      onRefresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  // 필터 유형만 삭제 실행
  const executeDeleteByFilter = async () => {
    if (checkedPassageIds.size === 0 || !hasTypeFilter) return

    const typeName = getFilterTypeName()
    const isDataTypeFilter = filterType === 'dataType'
    const confirmMsg = isDataTypeFilter
      ? `${checkedPassageIds.size}개 지문에서 "${typeName}" 데이터만 삭제하시겠습니까?`
      : `${checkedPassageIds.size}개 지문에서 "${typeName}" 문제 + 종속 데이터를 삭제하시겠습니까?`
    
    if (!confirm(confirmMsg + '\n\n⚠️ 이 작업은 되돌릴 수 없습니다.')) return

    setIsDeleting(true)
    try {
      const passageIds = Array.from(checkedPassageIds)
      
      const response = await fetch('/api/passages/batch-delete-generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageIds,
          deleteType: isDataTypeFilter ? 'byDataType' : 'byQuestionType',
          questionTypeId: filterType === 'questionType' ? selectedTypeId : undefined,
          dataTypeId: filterType === 'dataType' ? selectedTypeId : undefined,
        }),
      })

      if (!response.ok) throw new Error('삭제 실패')

      const result = await response.json()
      toast.success(result.message)
      
      setCheckedPassageIds(new Set())
      onRefresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('삭제에 실패했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  const isAllSelected = allVisiblePassageIds.length > 0 && checkedPassageIds.size === allVisiblePassageIds.length
  const hasChecked = checkedPassageIds.size > 0

  return (
    <div className="space-y-3">
      {/* 헤더 - 체크박스 컨트롤 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isAllSelected}
                onCheckedChange={toggleSelectAll}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">
                전체선택
              </span>
              {hasChecked && (
                <Badge variant="secondary" className="text-xs ml-2">
                  {checkedPassageIds.size}개 선택
                </Badge>
              )}
            </div>
            
            {hasTypeFilter && (
              <Badge className="text-xs bg-violet-100 text-violet-700 border-violet-300">
                🔍 {getFilterTypeName()}
              </Badge>
            )}
          </div>
          
          {/* 삭제 버튼들 */}
          {hasChecked && (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="h-8 text-xs"
                onClick={executeDeleteAll}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3 mr-1" />
                )}
                전체삭제
              </Button>
              
              {hasTypeFilter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50"
                  onClick={executeDeleteByFilter}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  {getFilterTypeName()}만 삭제
                </Button>
              )}
            </div>
          )}

          {/* 필터 안내 */}
          {hasTypeFilter && hasChecked && (
            <div className="mt-3 text-xs text-violet-600 bg-violet-50 rounded px-3 py-2">
              💡 "{getFilterTypeName()}만 삭제" 클릭 시 해당 유형 + 종속 데이터만 삭제됩니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 지문 카드 목록 */}
      <div className="space-y-2">
        {selectedTextbooks.map(({ textbook, groupName }) => 
          textbook.units?.map(unit => 
            unit.passages?.filter(p => isPassageVisible(p)).map(passage => {
              const stats = getPassageStats(passage)
              const isSelected = detailPassageId === passage.id
              const isChecked = checkedPassageIds.has(passage.id)
              
              return (
                <Card 
                  key={passage.id}
                  className={cn(
                    "transition-all cursor-pointer hover:shadow-md",
                    isSelected && "ring-2 ring-violet-500 shadow-lg",
                    isChecked && "bg-blue-50/50"
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      {/* 체크박스 */}
                      <div onClick={(e) => {
                        e.stopPropagation()
                        togglePassageCheck(passage.id, e)
                      }}>
                        <Checkbox 
                          checked={isChecked}
                          className="h-4 w-4"
                        />
                      </div>

                      {/* 지문 정보 */}
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => onSelectPassage(passage.id)}
                      >
                        <div className="font-medium text-sm truncate mb-1">
                          {passage.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {textbook.name} &gt; {unit.name}
                        </div>
                      </div>

                      {/* 상태 배지 */}
                      <div className="flex items-center gap-2">
                        {/* 문제 유형 필터가 적용된 경우 - 해당 유형의 실제 상태 표시 */}
                        {filterType === 'questionType' && selectedTypeId !== 'all' ? (
                          (() => {
                            const status = passage.generatedQuestions?.[selectedTypeId]
                            
                            if (status === 'completed') {
                              return (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  ✅ 완료
                                </Badge>
                              )
                            } else if (status === 'failed' || status === 'error') {
                              return (
                                <Badge variant="destructive" className="text-xs">
                                  ❌ 오류
                                </Badge>
                              )
                            } else {
                              // undefined 또는 'pending' = 미생성
                              return (
                                <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                                  ⏳ 미생성
                                </Badge>
                              )
                            }
                          })()
                        ) : filterType === 'dataType' && selectedTypeId !== 'all' ? (
                          // 데이터 유형 필터가 적용된 경우
                          (() => {
                            const status = passage.generatedData?.[selectedTypeId]
                            
                            if (status === 'completed') {
                              return (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  ✅ 완료
                                </Badge>
                              )
                            } else if (status === 'failed' || status === 'error') {
                              return (
                                <Badge variant="destructive" className="text-xs">
                                  ❌ 오류
                                </Badge>
                              )
                            } else {
                              return (
                                <Badge variant="outline" className="text-xs text-gray-600 border-gray-300">
                                  ⏳ 미생성
                                </Badge>
                              )
                            }
                          })()
                        ) : (
                          // 필터 없음 - 전체 통계 표시
                          <>
                            {stats.dataCompleted > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                <Database className="w-3 h-3 mr-1" />
                                {stats.dataCompleted}/{stats.dataTotal}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                <Database className="w-3 h-3 mr-1" />
                                0/{stats.dataTotal}
                              </Badge>
                            )}
                            
                            {stats.questionCompleted > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                <HelpCircle className="w-3 h-3 mr-1" />
                                {stats.questionCompleted}/{stats.questionTotal}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                <HelpCircle className="w-3 h-3 mr-1" />
                                0/{stats.questionTotal}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>

                      {/* 미리보기 버튼 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectPassage(passage.id)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )
        )}
        
        {/* 필터링 결과가 없을 때 */}
        {allVisiblePassageIds.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                필터 조건에 맞는 지문이 없습니다
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export function StatusDashboard({ 
  mode = 'status', 
  selectedNode, 
  selectedTextbookIds = [],
  onTextbookSelectionChange,
}: StatusDashboardProps) {
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // 필터 상태 (내부 관리)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  
  // 문제 유형 옵션 (필터용)
  const [filterQuestionTypes, setFilterQuestionTypes] = useState<QuestionTypeInfo[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)

  // 지문 상세 패널
  const [detailPassageId, setDetailPassageId] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<PassageDetailData | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    data: true,
    questions: true,
  })
  
  // 문제 미리보기 상태
  const [previewQuestionId, setPreviewQuestionId] = useState<string | null>(null)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  
  // 문제 미리보기 기능
  const openQuestionPreview = (item: GeneratedQuestionItem) => {
    setPreviewQuestionId(item.id)
    setIsPreviewModalOpen(true)
  }

  // 문제 유형 로드
  useEffect(() => {
    const loadTypes = async () => {
      setIsLoadingTypes(true)
      try {
        const qtRes = await fetch('/api/question-types')
        
        if (qtRes.ok) {
          const qtData = await qtRes.json()
          console.log('[StatusDashboard] 🔧 Loaded question types for filter:', qtData)
          setFilterQuestionTypes(qtData)
        }
      } catch (error) {
        console.error('Failed to load question types:', error)
      } finally {
        setIsLoadingTypes(false)
      }
    }
    
    if (mode === 'manage') {
      loadTypes()
    }
  }, [mode])
  
  // 필터 초기화
  const handleResetFilters = () => {
    setFilterType('all')
    setSelectedTypeId('all')
    setStatusFilter('all')
  }
  
  // 필터가 적용되었는지 확인
  const isFilterApplied = selectedTypeId !== 'all' || statusFilter !== 'all'
  
  // 전체 교재 선택/해제
  const handleToggleAllTextbooks = () => {
    if (!statusData || !onTextbookSelectionChange) return
    
    const allTextbookIds = statusData.hierarchy.flatMap(group => 
      group.textbooks?.map(t => t.id) || []
    )
    
    if (selectedTextbookIds.length === allTextbookIds.length) {
      // 전체 해제
      onTextbookSelectionChange([])
    } else {
      // 전체 선택
      onTextbookSelectionChange(allTextbookIds)
    }
  }

  // 데이터 로드
  const loadStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/status')
      if (!response.ok) throw new Error('Failed to load status')
      const data = await response.json()
      
      // ⭐ 디버깅 로그 추가
      console.log('[StatusDashboard] 📊 Loaded status data:', {
        questionTypes: data.questionTypes,
        totalPassages: data.summary?.passages,
        samplePassage: data.hierarchy[0]?.textbooks?.[0]?.units?.[0]?.passages?.[0],
      })
      
      // 생성된 문제가 있는 지문 찾기
      const passagesWithQuestions = data.hierarchy.flatMap((g: GroupInfo) => 
        g.textbooks?.flatMap(t => 
          t.units?.flatMap(u => 
            u.passages?.filter(p => 
              Object.keys(p.generatedQuestions || {}).length > 0
            ) || []
          ) || []
        ) || []
      )
      
      console.log('[StatusDashboard] 📝 Passages with generated questions:', {
        count: passagesWithQuestions.length,
        samples: passagesWithQuestions.slice(0, 3).map((p: PassageInfo) => ({
          id: p.id,
          name: p.name,
          generatedQuestions: p.generatedQuestions,
        }))
      })
      
      setStatusData(data)
    } catch (error) {
      console.error('Error loading status:', error)
      toast.error('현황 데이터를 불러오는데 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  // 지문 상세 로드
  const loadPassageDetail = useCallback(async (passageId: string) => {
    setIsLoadingDetail(true)
    try {
      const response = await fetch(`/api/passages/${passageId}/generated`)
      if (!response.ok) throw new Error('Failed to load passage detail')
      const data = await response.json()
      setDetailData(data)
    } catch (error) {
      console.error('Error loading passage detail:', error)
      toast.error('지문 상세를 불러오는데 실패했습니다')
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  // 트리에서 지문 선택 시 상세 패널 열기
  useEffect(() => {
    if (!selectedNode || mode !== 'manage') return
    
    if (selectedNode.type === 'passage') {
      setDetailPassageId(selectedNode.id)
      loadPassageDetail(selectedNode.id)
    }
  }, [selectedNode, mode, loadPassageDetail])

  // 지문 선택 시 상세 로드
  const handleSelectPassageForDetail = (passageId: string) => {
    if (detailPassageId === passageId) {
      setDetailPassageId(null)
      setDetailData(null)
    } else {
      setDetailPassageId(passageId)
      loadPassageDetail(passageId)
    }
  }

  // 생성 데이터 삭제
  const handleDeleteData = async (dataId: string) => {
    if (!confirm('이 데이터를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/generated-data/${dataId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete')
      
      toast.success('데이터가 삭제되었습니다')
      
      if (detailPassageId) {
        loadPassageDetail(detailPassageId)
      }
      loadStatus()
    } catch (error) {
      console.error('Error deleting data:', error)
      toast.error('삭제에 실패했습니다')
    }
  }

  // 생성 문제 삭제
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/generated-questions/${questionId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete')
      
      toast.success('문제가 삭제되었습니다')
      
      if (detailPassageId) {
        loadPassageDetail(detailPassageId)
      }
      loadStatus()
    } catch (error) {
      console.error('Error deleting question:', error)
      toast.error('삭제에 실패했습니다')
    }
  }

  // 진행률 계산
  const getProgress = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  // 상태 아이콘
  const getStatusIcon = (status: string | undefined) => {
    if (status === 'completed') return '✅'
    if (status === 'failed' || status === 'error') return '❌'
    if (status === 'processing') return '🔄'
    return '⏳'
  }

  // 섹션 토글
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-muted-foreground">현황 데이터 로딩 중...</span>
      </div>
    )
  }

  if (!statusData) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16">
        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">현황 데이터를 불러올 수 없습니다</p>
        <Button onClick={loadStatus} variant="outline" className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          다시 시도
        </Button>
      </div>
    )
  }

  const { summary, dataTypes, questionTypes } = statusData

  return (
    <div className="flex h-full">
      {/* 왼쪽: 현황 및 검색 */}
      <div className={cn(
        "flex-1 overflow-auto p-6 space-y-6",
        detailPassageId && "border-r"
      )}>
        {/* 헤더 - 현황 모드 */}
        {mode === 'status' && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            콘텐츠 관리 센터
          </h3>
          <Button onClick={loadStatus} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
        )}

        {/* 헤더 - 문제관리 모드 */}
        {mode === 'manage' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Search className="w-5 h-5 text-violet-600" />
              문제 관리
            </h3>
            {selectedNode && (
              <Badge variant="secondary" className="text-sm">
                📍 {selectedNode.type === 'group' ? '그룹' : 
                    selectedNode.type === 'textbook' ? '교재' :
                    selectedNode.type === 'unit' ? '단원' : '지문'}: {selectedNode.name}
              </Badge>
            )}
          </div>
          <Button onClick={loadStatus} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
        )}

        {/* 요약 통계 - 현황 모드에서만 표시 */}
        {mode === 'status' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 bg-blue-50/50">
            <div className="text-2xl font-bold text-blue-700">{summary.groups}</div>
            <div className="text-sm text-blue-600">그룹</div>
          </div>
          <div className="border rounded-lg p-4 bg-green-50/50">
            <div className="text-2xl font-bold text-green-700">{summary.textbooks}</div>
            <div className="text-sm text-green-600">교재</div>
          </div>
          <div className="border rounded-lg p-4 bg-orange-50/50">
            <div className="text-2xl font-bold text-orange-700">{summary.units}</div>
            <div className="text-sm text-orange-600">단원</div>
          </div>
          <div className="border rounded-lg p-4 bg-purple-50/50">
            <div className="text-2xl font-bold text-purple-700">{summary.passages}</div>
            <div className="text-sm text-purple-600">지문</div>
          </div>
        </div>
        )}

        {/* 문장 분리 현황 - 현황 모드에서만 표시 */}
        {mode === 'status' && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            문장 분리 현황
          </h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>진행률</span>
                <span>{getProgress(summary.sentenceSplit.completed, summary.passages)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${getProgress(summary.sentenceSplit.completed, summary.passages)}%` }}
                />
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600">✅ {summary.sentenceSplit.completed}</span>
              <span className="text-gray-500">⏳ {summary.sentenceSplit.pending}</span>
              <span className="text-red-600">❌ {summary.sentenceSplit.error}</span>
            </div>
          </div>
        </div>
        )}

        {/* 데이터 유형별 현황 - 현황 모드에서만 표시 */}
        {mode === 'status' && dataTypes.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              데이터 유형별 현황
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dataTypes.map(dt => (
                <div key={dt.id} className="border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{dt.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {dt.category === 'base' ? '기본' : 'AI'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600">✅ {dt.stats.completed}</span>
                    <span className="text-red-600">❌ {dt.stats.failed}</span>
                    <span className="text-muted-foreground">
                      / {summary.passages}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 문제 유형별 현황 - 현황 모드에서만 표시 */}
        {mode === 'status' && questionTypes && questionTypes.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              문제 유형별 현황
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {questionTypes.map(qt => (
                <div key={qt.id} className="border rounded-lg p-3 bg-violet-50/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{qt.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-600">✅ {qt.stats.completed}</span>
                    <span className="text-red-600">❌ {qt.stats.failed}</span>
                    <span className="text-muted-foreground">
                      / {summary.passages}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 선택된 교재 목록 (문제관리 모드) */}
        {mode === 'manage' && (
        <>
          {selectedTextbookIds.length === 0 ? (
            <div className="border-2 border-dashed border-violet-300 rounded-lg p-12 text-center bg-violet-50/30">
              <FolderOpen className="w-16 h-16 mx-auto text-violet-400 mb-4" />
              <h3 className="text-lg font-semibold text-violet-900 mb-2">교재를 선택해주세요</h3>
              <p className="text-violet-700 mb-4">좌측 패널에서 교재를 체크박스로 선택하세요</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-violet-200 text-sm text-violet-600">
                <span className="text-xl">☐</span>
                <span>교재 이름 클릭 시 체크됩니다</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 필터 바 - 중앙 패널 상단 */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-violet-600" />
                      <span className="font-medium text-sm">검색 조건</span>
                    </div>
                    {isFilterApplied && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleResetFilters}
                        className="h-7 text-xs"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        초기화
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* 1. 문제 유형 선택 */}
                    <div className="flex-1 min-w-[200px]">
                      <Select 
                        value={selectedTypeId} 
                        onValueChange={(id) => {
                          setSelectedTypeId(id)
                          // 문제 유형이 선택되면 자동으로 questionType으로 설정
                          if (id !== 'all') {
                            setFilterType('questionType')
                          } else {
                            setFilterType('all')
                          }
                        }}
                        disabled={isLoadingTypes}
                      >
                        <SelectTrigger className="bg-white h-9">
                          <SelectValue placeholder={isLoadingTypes ? '로딩중...' : '전체 문제 유형'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체 문제 유형</SelectItem>
                          {filterQuestionTypes.map(qt => (
                            <SelectItem key={qt.id} value={qt.id}>
                              <span className="flex items-center gap-2">
                                <HelpCircle className="w-3 h-3" />
                                {qt.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 3. 상태 */}
                    <div className="flex-1 min-w-[140px]">
                      <Select 
                        value={statusFilter} 
                        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                      >
                        <SelectTrigger className="bg-white h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="completed">✅ 완료</SelectItem>
                          <SelectItem value="pending">⏳ 대기</SelectItem>
                          <SelectItem value="failed">❌ 오류</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 범위 정보 */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge variant="secondary" className="text-xs">
                        📚 {selectedTextbookIds.length}개 교재
                      </Badge>
                    </div>
                  </div>
                  
                  {/* 필터 안내 */}
                  {selectedTypeId !== 'all' && (() => {
                    const typeName = filterQuestionTypes.find(q => q.id === selectedTypeId)?.name
                    return (
                      <div className="mt-3 text-xs text-blue-600 bg-blue-50 rounded px-3 py-2">
                        💡 "{typeName}" 유형의 모든 지문을 표시합니다. 
                        {statusFilter === 'all' && ' 완료/미생성/오류 상태를 모두 표시합니다.'}
                        {statusFilter === 'pending' && ' 아직 생성되지 않은 지문만 표시됩니다.'}
                        {statusFilter === 'completed' && ' 이미 생성 완료된 지문만 표시됩니다.'}
                        {statusFilter === 'failed' && ' 생성 중 오류가 발생한 지문만 표시됩니다.'}
                      </div>
                    )
                  })()}
                </CardHeader>
              </Card>
              
              {/* 필터 유형명 가져오기 함수 */}
              {(() => {
                const getFilterTypeName = (): string => {
                  if (filterType === 'dataType' && selectedTypeId !== 'all') {
                    const dt = filterDataTypes.find(d => d.id === selectedTypeId)
                    return dt?.name || '데이터 유형'
                  }
                  if (filterType === 'questionType' && selectedTypeId !== 'all') {
                    const qt = filterQuestionTypes.find(q => q.id === selectedTypeId)
                    return qt?.name || '문제 유형'
                  }
                  return ''
                }
                return null
              })()}

              {/* 교재/지문 목록 */}
              <SelectedTextbooksView 
                textbookIds={selectedTextbookIds}
                hierarchy={statusData.hierarchy}
                dataTypes={dataTypes}
                questionTypes={questionTypes}
                onSelectPassage={handleSelectPassageForDetail}
                detailPassageId={detailPassageId}
                onRefresh={loadStatus}
                filterType={filterType}
                selectedTypeId={selectedTypeId}
                statusFilter={statusFilter}
              />
            </div>
        )}
      </>
        )}
      </div>

      {/* 문제 미리보기 모달 */}
      <QuestionPreviewModal
        questionId={previewQuestionId}
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false)
          setPreviewQuestionId(null)
        }}
      />

      {/* 오른쪽: 지문 상세 패널 (문제관리 모드에서만 표시) */}
      {mode === 'manage' && detailPassageId && (
        <div className="w-[450px] flex-shrink-0 overflow-auto border-l bg-white">
          <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
            <h4 className="font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              지문 상세 관리
            </h4>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => { setDetailPassageId(null); setDetailData(null); }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : detailData ? (
            <div className="p-4 space-y-4">
              {/* 지문 정보 */}
              <div className="border rounded-lg p-3 bg-slate-50">
                <h5 className="font-medium text-sm mb-2">{detailData.passage.name}</h5>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>📚 {detailData.passage.unit?.textbook?.group?.name} &gt; {detailData.passage.unit?.textbook?.name}</p>
                  <p>📖 {detailData.passage.unit?.name}</p>
                  <p>📝 {detailData.passage.sentence_count}개 문장 | {getStatusIcon(detailData.passage.sentence_split_status)} 분리</p>
                </div>
              </div>

              {/* 생성된 데이터 */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  className="w-full p-3 bg-blue-50 flex items-center justify-between text-sm font-medium"
                  onClick={() => toggleSection('data')}
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-600" />
                    생성된 데이터 ({detailData.generatedData.length})
                  </span>
                  {expandedSections.data ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expandedSections.data && (
                  <div className="divide-y">
                    {detailData.generatedData.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        생성된 데이터가 없습니다
                      </div>
                    ) : (
                      detailData.generatedData.map(item => (
                        <div key={item.id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.data_type?.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.data_type?.category === 'base' ? '기본' : 'AI'}
                              </Badge>
                              <span>{getStatusIcon(item.status)}</span>
                            </div>
                          </div>
                          
                          {item.status === 'completed' && item.result && (
                            <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded max-h-20 overflow-auto">
                              <pre className="whitespace-pre-wrap">
                                {typeof item.result === 'string' 
                                  ? item.result.slice(0, 200) + (item.result.length > 200 ? '...' : '')
                                  : JSON.stringify(item.result, null, 2).slice(0, 200)}
                              </pre>
                            </div>
                          )}
                          
                          {item.error_message && (
                            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                              {item.error_message}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteData(item.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              삭제
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 생성된 문제 */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  className="w-full p-3 bg-violet-50 flex items-center justify-between text-sm font-medium"
                  onClick={() => toggleSection('questions')}
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-violet-600" />
                    생성된 문제 ({detailData.generatedQuestions.length})
                  </span>
                  {expandedSections.questions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {expandedSections.questions && (
                  <div className="divide-y">
                    {detailData.generatedQuestions.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        생성된 문제가 없습니다
                      </div>
                    ) : (
                      detailData.generatedQuestions.map(item => (
                        <div key={item.id} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{item.question_type?.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.question_type?.purpose === 'learning' ? '학습' : '평가'}
                              </Badge>
                              <span>{getStatusIcon(item.status)}</span>
                            </div>
                          </div>
                          
                          {item.status === 'completed' && item.body && (
                            <div className="text-xs text-muted-foreground mb-2 p-2 bg-muted rounded max-h-20 overflow-auto">
                              <pre className="whitespace-pre-wrap">
                                {typeof item.body === 'string' 
                                  ? item.body.slice(0, 200) + (item.body.length > 200 ? '...' : '')
                                  : JSON.stringify(item.body, null, 2).slice(0, 200)}
                              </pre>
                            </div>
                          )}
                          
                          {item.error_message && (
                            <div className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded">
                              {item.error_message}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            {item.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                onClick={() => openQuestionPreview(item)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                미리보기
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteQuestion(item.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              삭제
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 안내 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                💡 삭제된 데이터는 복구할 수 없습니다. 재생성이 필요하면 문제출제 탭에서 진행해주세요.
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              데이터를 불러올 수 없습니다
            </div>
          )}
        </div>
      )}
      
    </div>
  )
}
