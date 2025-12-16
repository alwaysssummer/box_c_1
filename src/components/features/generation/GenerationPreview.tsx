'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  CheckCircle2, 
  XCircle, 
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  Save,
  AlertCircle,
  Loader2,
  Printer,
  ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PreviewCard } from './PreviewCard'
import { Progress } from '@/components/ui/progress'
import type { QuestionTypeWithBlocks } from '@/types/database'
import { UnifiedRenderer } from '@/components/features/output'
import { DEFAULT_OUTPUT_CONFIG } from '@/types/output-config'
import type { ViewType } from '@/types/output-config'

interface GenerationResult {
  passage_id: string
  passage_name: string
  passage_content?: string  // 원본 지문
  unit_name?: string  // 단원명
  textbook_name?: string  // 교재명
  success: boolean
  content?: Record<string, unknown>
  error?: string
}

interface PassageInfo {
  id: string
  name: string
  textbook?: string
  unit?: string
}

interface RegisterResult {
  passage_id: string
  passage_name: string
  success: boolean
  error?: string
}

interface GenerationPreviewProps {
  results: GenerationResult[]
  questionType: QuestionTypeWithBlocks | null
  onRegister: (selectedIds: string[]) => void
  onRetry: () => void
  onRetryFailed?: (passageIds: string[]) => void
  // ⭐ 생성 중 상태 props
  isGenerating?: boolean
  passages?: PassageInfo[]
  current?: number
  total?: number
  // ⭐ 등록 중 상태 props
  isRegistering?: boolean
  registerResults?: RegisterResult[]
}

export function GenerationPreview({ 
  results, 
  questionType,
  onRegister,
  onRetry,
  onRetryFailed,
  isGenerating = false,
  passages = [],
  current = 0,
  total = 0,
  isRegistering = false,
  registerResults = [],
}: GenerationPreviewProps) {
  // 선택 상태 (성공한 것만 기본 선택)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => 
    new Set(results.filter(r => r.success).map(r => r.passage_id))
  )
  
  // 펼치기 상태
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  
  // ⭐ 출력 미리보기 모달 상태
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [previewViewType, setPreviewViewType] = useState<ViewType>('student')
  
  // 성공/실패 카운트
  const successResults = useMemo(() => results.filter(r => r.success), [results])
  const failedResults = useMemo(() => results.filter(r => !r.success), [results])
  
  // ⭐ 표시할 항목 목록 생성 (생성 중 / 등록 중 / 완료 통합)
  const displayItems = useMemo(() => {
    if (isGenerating && passages.length > 0) {
      // 생성 중: 전체 지문 목록 기반
      const resultMap = new Map(results.map(r => [r.passage_id, r]))
      
      return passages.map((passage, index) => {
        const result = resultMap.get(passage.id)
        const isProcessing = index === results.length && !result
        const isPending = index > results.length
        
        return {
          passage_id: passage.id,
          passage_name: passage.name,
          textbook_name: passage.textbook,
          unit_name: passage.unit,
          success: result?.success ?? false,
          isProcessing,
          isPending,
          passage_content: result?.passage_content,
          content: result?.content,
          error: result?.error,
        }
      })
    }
    
    if (isRegistering) {
      // 등록 중: 성공한 결과 기반
      const successResults = results.filter(r => r.success)
      const registerMap = new Map(registerResults.map(r => [r.passage_id, r]))
      
      return successResults.map((result, index) => {
        const registerResult = registerMap.get(result.passage_id)
        const isProcessing = index === registerResults.length && !registerResult
        const isPending = index > registerResults.length
        
        return {
          ...result,
          isProcessing,
          isPending,
          registerSuccess: registerResult?.success,
          registerError: registerResult?.error,
        }
      })
    }
    
    // 생성 완료: results 그대로 사용
    return results.map(r => ({ ...r, isProcessing: false, isPending: false }))
  }, [isGenerating, isRegistering, passages, results, registerResults])
  
  // 진행률 계산
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0
  
  // 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === successResults.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(successResults.map(r => r.passage_id)))
    }
  }
  
  // 펼치기 토글
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  
  // 등록 버튼 클릭
  const handleRegister = () => {
    onRegister(Array.from(selectedIds))
  }
  
  // ⭐ 인쇄 버튼 클릭 - 인쇄 전용 페이지 열기
  const handlePrint = () => {
    try {
      // 인쇄 데이터 준비
      const printData = {
        questions: successResults.map(r => ({
          id: r.passage_id,
          ...r.content,
          passage: r.passage_content || (r.content as any)?.passage,
          _meta: {
            textbookName: r.textbook_name,
            unitName: r.unit_name,
            passageName: r.passage_name,
            questionTypeName: questionType?.name,
          }
        })),
        outputConfig: questionType?.output_config || DEFAULT_OUTPUT_CONFIG,
        viewType: previewViewType,
      }
      
      // sessionStorage에 저장
      sessionStorage.setItem('printData', JSON.stringify(printData))
      
      // 기존 인쇄 창이 있으면 재사용, 없으면 새로 생성
      const windowName = 'print-preview-window'
      const windowFeatures = [
        'width=1400',
        'height=900',
        'left=100',
        'top=50',
        'menubar=no',
        'toolbar=no',
        'location=no',
        'status=no',
        'resizable=yes',
        'scrollbars=yes'
      ].join(',')
      
      // 새 창에서 인쇄 전용 페이지 열기
      const printWindow = window.open('/print-preview', windowName, windowFeatures)
      
      if (!printWindow) {
        alert('팝업이 차단되었습니다.\n브라우저 설정에서 팝업을 허용해주세요.')
        // sessionStorage 정리
        sessionStorage.removeItem('printData')
      } else {
        // 새 창에 포커스
        printWindow.focus()
      }
    } catch (error) {
      console.error('[Print] Error:', error)
      alert('인쇄 준비 중 오류가 발생했습니다.')
      sessionStorage.removeItem('printData')
    }
  }
  
  // ⭐ 출력 미리보기 모드일 때는 완전히 다른 레이아웃
  if (showPrintPreview) {
    return (
      <div className="space-y-4">
        {/* 상단 컨트롤 - 인쇄 시 숨김 */}
        <Card className="no-print">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Tabs 
                  value={previewViewType} 
                  onValueChange={(v) => setPreviewViewType(v as ViewType)}
                >
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="student">학생용</TabsTrigger>
                    <TabsTrigger value="teacher">교사용</TabsTrigger>
                    <TabsTrigger value="answer_only">정답만</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowPrintPreview(false)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  목록으로
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  인쇄
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 출력 미리보기 내용 - 인쇄 시 전체 화면 */}
        <div className="bg-gray-100 p-8 rounded-lg print:bg-white print:p-0">
          <UnifiedRenderer
            questions={successResults.map(r => ({
              id: r.passage_id,
              ...r.content,  // 먼저 content 펼치기
              passage: r.passage_content || (r.content as any)?.passage,  // passage 명시적 설정
              // 메타 정보 추가
              _meta: {
                textbookName: r.textbook_name,
                unitName: r.unit_name,
                passageName: r.passage_name,
                questionTypeName: questionType?.name,  // ⭐ 문제 유형명 추가
              }
            }))}
            outputConfig={questionType?.output_config || DEFAULT_OUTPUT_CONFIG}
            mode="print"
            viewType={previewViewType}
          />
        </div>
      </div>
    )
  }

  // ⭐ 기본 목록 모드
  return (
    <div className="space-y-4">
      {/* 요약 헤더 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              {isGenerating ? (
                <>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                    <span className="text-sm font-medium">
                      문제 생성 중... ({current} / {total})
                    </span>
                  </div>
                </>
              ) : isRegistering ? (
                <>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                    <span className="text-sm font-medium">
                      문제 등록 중... ({registerResults.length} / {successResults.length})
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm">
                      성공: <span className="font-semibold text-green-600">{successResults.length}</span>개
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm">
                      실패: <span className="font-semibold text-red-600">{failedResults.length}</span>개
                    </span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      등록 선택: {selectedIds.size}개
                    </span>
                  </div>
                </>
              )}
            </div>
            
            {!isGenerating && !isRegistering && (
              <div className="flex items-center gap-2">
                {/* ⭐ 출력 미리보기 버튼 */}
                {successResults.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPrintPreview(true)}
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    출력 미리보기
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  다시 출제
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleRegister}
                  disabled={selectedIds.size === 0}
                >
                  <Save className="w-4 h-4 mr-1" />
                  선택한 {selectedIds.size}개 등록
                </Button>
              </div>
            )}
          </div>
          
          {/* ⭐ 진행률 바 (생성 중 / 등록 중일 때) */}
          {(isGenerating || isRegistering) && (
            <div className="space-y-2">
              <Progress value={percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{percentage}% 완료</span>
                {isGenerating && total > 0 && current < total && (
                  <span>예상 남은 시간: ~{Math.ceil((total - current) * 3)}초</span>
                )}
                {isRegistering && (
                  <span>데이터베이스에 저장 중...</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 전체 선택 */}
      {successResults.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <Checkbox 
            checked={selectedIds.size === successResults.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            성공한 항목 전체 선택
          </span>
        </div>
      )}
      
      {/* ⭐ 결과 목록 (생성 중/완료 통합) */}
      <div className="space-y-1">
        {displayItems.map((item, index) => (
          <Card 
            key={item.passage_id}
            className={cn(
              "transition-colors",
              !item.success && !item.isPending && !item.isProcessing && "border-red-200 bg-red-50/50",
              item.isProcessing && "border-blue-200 bg-blue-50/30",
              item.isPending && "opacity-60"
            )}
          >
            <CardHeader className="py-0 px-2">
              <div className="flex items-center gap-1 min-h-[20px]">
                {/* 체크박스 (성공한 것만, 생성 완료 시에만) */}
                {!isGenerating && item.success && (
                  <Checkbox 
                    checked={selectedIds.has(item.passage_id)}
                    onCheckedChange={() => toggleSelect(item.passage_id)}
                    className="h-3.5 w-3.5"
                  />
                )}
                
                {/* ⭐ 상태 아이콘 (생성 중 / 등록 중 상태 추가) */}
                {isRegistering ? (
                  // 등록 중 아이콘
                  (item as any).registerSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : item.isProcessing ? (
                    <Loader2 className="w-4 h-4 text-green-500 flex-shrink-0 animate-spin" />
                  ) : item.isPending ? (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )
                ) : (
                  // 생성 중 아이콘
                  item.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : item.isProcessing ? (
                    <Loader2 className="w-4 h-4 text-blue-500 flex-shrink-0 animate-spin" />
                  ) : item.isPending ? (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )
                )}
                
                {/* 지문 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground font-mono leading-tight">
                      {index + 1}.
                      {item.textbook_name && <span> {item.textbook_name} &gt;</span>}
                      {item.unit_name && <span> {item.unit_name} &gt;</span>}
                      <span className="font-sans"> {item.passage_name}</span>
                    </span>
                    {!item.success && !item.isPending && !item.isProcessing && (
                      <Badge variant="destructive" className="text-[10px] px-1 py-0 h-[18px] leading-none">
                        실패
                      </Badge>
                    )}
                    {isRegistering && item.isProcessing && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-[18px] leading-none bg-green-100 text-green-700">
                        등록 중...
                      </Badge>
                    )}
                    {isRegistering && item.isPending && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-[18px] leading-none text-gray-500">
                        대기 중
                      </Badge>
                    )}
                    {isRegistering && (item as any).registerSuccess && (
                      <Badge variant="default" className="text-[10px] px-1 py-0 h-[18px] leading-none bg-green-600">
                        등록 완료
                      </Badge>
                    )}
                    {isGenerating && item.isProcessing && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-[18px] leading-none bg-blue-100 text-blue-700">
                        생성 중...
                      </Badge>
                    )}
                    {isGenerating && item.isPending && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-[18px] leading-none text-gray-500">
                        대기 중
                      </Badge>
                    )}
                    {!item.success && item.error && (
                      <span className="text-[10px] text-red-600 truncate max-w-32">
                        {item.error}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 펼치기 버튼 (성공한 것만, 생성 완료 시에만) */}
                {!isGenerating && item.success && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => toggleExpand(item.passage_id)}
                    className="h-[20px] px-1 py-0 text-[11px]"
                  >
                    {expandedIds.has(item.passage_id) ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-0.5" />
                        접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-0.5" />
                        미리보기
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            
            {/* 미리보기 콘텐츠 (생성 완료 시에만) */}
            {!isGenerating && item.success && expandedIds.has(item.passage_id) && item.content && (
              <CardContent className="pt-0 pb-4 px-4">
              <PreviewCard 
                content={item.content}
                passage={item.passage_content}
                layoutConfig={questionType?.layout_config}
                outputConfig={questionType?.output_config}
                sequenceNumber={index + 1}
                textbookName={item.textbook_name}
                unitName={item.unit_name}
                passageName={item.passage_name}
              />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
      
      {/* ⭐ 실패한 항목이 있을 때 재생성 버튼 */}
      {failedResults.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  {failedResults.length}개 지문에서 생성 실패
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  실패한 지문만 다시 생성하거나, 나중에 해당 지문을 선택하여 재출제할 수 있습니다.
                </p>
              </div>
              {onRetryFailed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetryFailed(failedResults.map(r => r.passage_id))}
                  className="border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  실패한 항목만 재생성
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}





