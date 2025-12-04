'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ChevronRight, 
  ChevronDown, 
  Loader2, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSheetImport } from '@/contexts/SheetImportContext'

// 교재 타입 (간단한 형태)
interface TextbookForUpdate {
  id: string
  name: string
  units?: {
    id: string
    name: string
    passages?: {
      id: string
      name: string
    }[]
  }[]
}

interface SheetSelectorProps {
  groupName: string
  textbooks?: TextbookForUpdate[]  // 기존 교재 목록 (업데이트용)
  onRegister: (data: {
    name: string
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
  }) => Promise<void>
  onUpdate?: (textbookId: string, data: {
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
  }) => Promise<void>
}

export function SheetSelector({ groupName, textbooks = [], onRegister, onUpdate }: SheetSelectorProps) {
  const {
    googleSheetUrl,
    setGoogleSheetUrl,
    sheetInfo,
    isFetching,
    error,
    selectedItems,
    expandedUnits,
    setExpandedUnits,
    splitResults,
    isSplitting,
    selectedPassageKey,
    setSelectedPassageKey,
    handleFetchSheet,
    handleToggleUnit,
    handleTogglePassage,
    handleToggleAllPassages,
    getSelectedCount,
    getSplitCount,
    getTotalSentences,
    setIsUpdateMode,
  } = useSheetImport()

  const [isRegistering, setIsRegistering] = React.useState(false)
  const [expandedPassages, setExpandedPassages] = React.useState<Record<string, boolean>>({})
  
  // 업데이트 모드: 'new' = 새 교재 등록, 교재ID = 해당 교재 업데이트
  const [updateMode, setUpdateMode] = React.useState<string>('new')
  
  // 업데이트 모드 변경 시 context에 알림 (localStorage 복구 제어)
  React.useEffect(() => {
    setIsUpdateMode(updateMode !== 'new')
  }, [updateMode, setIsUpdateMode])
  
  // 선택된 교재의 매칭 정보
  const selectedTextbook = textbooks.find(t => t.id === updateMode)
  
  // 단원/지문 매칭 체크 함수
  const getMatchInfo = (sheetName: string, passageNumber: string) => {
    if (!selectedTextbook) return null
    
    const matchedUnit = selectedTextbook.units?.find(u => u.name === sheetName)
    if (!matchedUnit) return { unitMatch: false, passageMatch: false }
    
    const matchedPassage = matchedUnit.passages?.find(p => 
      p.name === `지문 ${passageNumber}` || p.name === passageNumber
    )
    return { 
      unitMatch: true, 
      passageMatch: !!matchedPassage,
      unitId: matchedUnit.id,
      passageId: matchedPassage?.id 
    }
  }

  const toggleUnitExpand = (sheetName: string) => {
    setExpandedUnits((prev) => ({ ...prev, [sheetName]: !prev[sheetName] }))
  }

  const togglePassageExpand = (key: string) => {
    setExpandedPassages((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // 분리 결과 상태 아이콘
  const getSplitStatusIcon = (key: string) => {
    const result = splitResults[key]
    if (!result) return null
    if (result.isLoading) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    if (result.error) return <AlertCircle className="w-4 h-4 text-destructive" />
    if (result.splitResult) {
      const conf = result.splitResult.confidence
      if (conf >= 0.9) return <CheckCircle2 className="w-4 h-4 text-green-500" />
      if (conf >= 0.7) return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      return <AlertCircle className="w-4 h-4 text-orange-500" />
    }
    return null
  }

  // 교재 등록 또는 업데이트
  const handleRegisterOrUpdate = async () => {
    if (!sheetInfo || getSelectedCount() === 0 || isRegistering) return

    setIsRegistering(true)
    try {
      const units = Object.entries(selectedItems).map(([sheetName, passageNumbers]) => {
        const sheet = sheetInfo.sheets.find(s => s.sheetName === sheetName)
        const passages = passageNumbers.map((num) => {
          const passage = sheet?.passages.find(p => p.number === num)
          const key = `${sheetName}-${num}`
          const splitResult = splitResults[key]
          
          // 디버깅
          console.log(`[SheetSelector] Key: ${key}, splitResult:`, splitResult)
          console.log(`[SheetSelector] sentences:`, splitResult?.splitResult?.sentences)

          return {
            name: `지문 ${num}`,
            content: passage?.englishPassage || '',
            koreanTranslation: passage?.koreanTranslation || '',
            sentences: splitResult?.splitResult?.sentences,
            splitModel: splitResult?.splitResult?.model,
            splitConfidence: splitResult?.splitResult?.confidence,
          }
        })
        return {
          name: sheetName,
          passages,
        }
      })

      if (updateMode === 'new') {
        // 새 교재 등록
        await onRegister({
          name: sheetInfo.fileName,
          units,
        })
      } else if (onUpdate) {
        // 기존 교재 업데이트
        await onUpdate(updateMode, { units })
      }
    } finally {
      setIsRegistering(false)
    }
  }
  
  // 매칭 통계
  const getMatchStats = () => {
    if (!selectedTextbook || !sheetInfo) return null
    
    let matchedUnits = 0
    let matchedPassages = 0
    let newUnits = 0
    let newPassages = 0
    
    Object.entries(selectedItems).forEach(([sheetName, passageNumbers]) => {
      const matchedUnit = selectedTextbook.units?.find(u => u.name === sheetName)
      if (matchedUnit) {
        matchedUnits++
        passageNumbers.forEach(num => {
          const matchedPassage = matchedUnit.passages?.find(p => 
            p.name === `지문 ${num}` || p.name === num
          )
          if (matchedPassage) matchedPassages++
          else newPassages++
        })
      } else {
        newUnits++
        newPassages += passageNumbers.length
      }
    })
    
    return { matchedUnits, matchedPassages, newUnits, newPassages }
  }

  const totalPassages = sheetInfo?.sheets.reduce((sum, s) => sum + s.passages.length, 0) || 0

  const matchStats = getMatchStats()
  
  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
        📁 {groupName} - {updateMode === 'new' ? '교재 등록' : '교재 업데이트'}
      </h3>

      {/* 등록/업데이트 모드 선택 */}
      {textbooks.length > 0 && (
        <div className="mb-4 flex-shrink-0">
          <label className="block text-sm font-medium text-foreground mb-2">
            등록 모드
          </label>
          <Select value={updateMode} onValueChange={setUpdateMode}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="등록 모드 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-500" />
                  <span>새 교재 등록</span>
                </div>
              </SelectItem>
              {textbooks.map(textbook => (
                <SelectItem key={textbook.id} value={textbook.id}>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-500" />
                    <span>{textbook.name} 업데이트</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* 업데이트 모드 안내 */}
          {updateMode !== 'new' && selectedTextbook && (
            <p className="text-xs text-muted-foreground mt-1">
              📌 단원명/지문번호가 일치하면 덮어쓰기, 새로운 항목은 추가됩니다
            </p>
          )}
        </div>
      )}

      {/* 구글시트 URL 입력 */}
      <div className="mb-4 flex-shrink-0">
        <label className="block text-sm font-medium text-foreground mb-2">
          구글시트 URL
        </label>
        <div className="flex gap-2">
          <Input
            type="text"
            value={googleSheetUrl}
            onChange={(e) => setGoogleSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="flex-1"
            disabled={isFetching}
          />
          <Button
            onClick={handleFetchSheet}
            disabled={!googleSheetUrl.trim() || isFetching}
            className="bg-green-600 hover:bg-green-700"
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              '조회'
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          * 시트가 &quot;링크가 있는 모든 사용자&quot;로 공유되어 있어야 합니다
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive flex-shrink-0">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 시트 정보 */}
      {sheetInfo && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* 교재명 */}
          <div className="flex items-center gap-2 mb-4 flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <span className="text-sm text-muted-foreground">교재명:</span>
            <span className="font-semibold text-primary">{sheetInfo.fileName}</span>
            <span className="text-xs text-muted-foreground">
              ({sheetInfo.sheets.length}개 시트, {totalPassages}개 지문)
            </span>
          </div>

          {/* 단원/지문 선택 */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span className="text-sm font-medium text-foreground">
                📚 시트/지문 선택
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleAllPassages}
                className="text-primary hover:text-primary"
              >
                {getSelectedCount() === totalPassages ? '전체 해제' : '전체 선택'}
              </Button>
            </div>

            <div className="flex-1 overflow-auto border border-border rounded-lg p-2 bg-muted/30">
              {sheetInfo.sheets.map((sheet) => {
                const sheetSelected = selectedItems[sheet.sheetName] || []
                const isAllSelected = sheetSelected.length === sheet.passages.length
                const isPartialSelected =
                  sheetSelected.length > 0 && sheetSelected.length < sheet.passages.length
                const isExpanded = expandedUnits[sheet.sheetName]
                
                const splitCountInSheet = sheet.passages.filter(p => {
                  const key = `${sheet.sheetName}-${p.number}`
                  return splitResults[key]?.splitResult && !splitResults[key]?.error
                }).length

                const errorCountInSheet = sheet.passages.filter(p => {
                  const key = `${sheet.sheetName}-${p.number}`
                  return splitResults[key]?.error
                }).length

                // 한글 검토 필요 건수 (시트 레벨)
                const warningCountInSheet = sheet.passages.reduce((count, p) => {
                  const key = `${sheet.sheetName}-${p.number}`
                  const result = splitResults[key]?.splitResult
                  if (result?.koreanIssues) {
                    return count + result.koreanIssues.filter(issue => issue.needsReview).length
                  }
                  return count
                }, 0)

                return (
                  <div
                    key={sheet.sheetName}
                    className="bg-white rounded-lg border border-border overflow-hidden mb-2"
                  >
                    <div className="flex items-center gap-2 p-3 hover:bg-muted/50">
                      <button
                        onClick={() => toggleUnitExpand(sheet.sheetName)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) {
                            (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isPartialSelected
                          }
                        }}
                        onCheckedChange={() => handleToggleUnit(sheet)}
                      />

                      <span
                        className="font-medium cursor-pointer flex-1"
                        onClick={() => toggleUnitExpand(sheet.sheetName)}
                      >
                        {sheet.sheetName}
                      </span>

                      <div className="flex items-center gap-2">
                        {warningCountInSheet > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            ⚠️ {warningCountInSheet}
                          </span>
                        )}
                        {splitCountInSheet > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            ✅ {splitCountInSheet}
                          </span>
                        )}
                        {errorCountInSheet > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            ❌ {errorCountInSheet}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {sheetSelected.length}/{sheet.passages.length}
                        </span>
                      </div>
                    </div>

                    {/* 지문 목록 */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 p-2 space-y-1">
                        {sheet.passages.map((passage, passageIndex) => {
                          // React key는 인덱스 포함하여 고유하게
                          const reactKey = `${sheet.sheetName}-${passageIndex}-${passage.number}`
                          // 데이터 key는 기존 형식 유지 (splitResults와 호환)
                          const key = `${sheet.sheetName}-${passage.number}`
                          const splitResult = splitResults[key]
                          const isSelected = selectedPassageKey === key
                          const hasSplitResult = splitResult?.splitResult && !splitResult?.error
                          const hasError = splitResult?.error
                          const isPassageExpanded = expandedPassages[key]
                          
                          // 한글 검토 필요 건수 (지문 레벨)
                          const warningCount = splitResult?.splitResult?.koreanIssues?.filter(
                            issue => issue.needsReview
                          ).length || 0
                          const hasWarning = warningCount > 0
                          
                          // 매칭 정보 (업데이트 모드)
                          const matchInfo = updateMode !== 'new' ? getMatchInfo(sheet.sheetName, passage.number) : null

                          return (
                            <div 
                              key={reactKey}
                              className={cn(
                                "rounded-lg border overflow-hidden transition-all",
                                isSelected 
                                  ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200" 
                                  : hasWarning
                                    ? "bg-amber-50 border-amber-200"
                                    : hasSplitResult
                                      ? "bg-white border-green-200"
                                      : hasError
                                        ? "bg-red-50 border-red-200"
                                        : "bg-white border-border"
                              )}
                            >
                              {/* 지문 헤더 */}
                              <div 
                                className={cn(
                                  "flex items-center gap-2 p-2 cursor-pointer",
                                  isSelected ? "hover:bg-blue-100" :
                                  hasWarning ? "hover:bg-amber-100" :
                                  hasSplitResult ? "hover:bg-green-50" :
                                  hasError ? "hover:bg-red-100" : "hover:bg-muted/50"
                                )}
                                onClick={() => setSelectedPassageKey(key)}
                              >
                                {/* 토글 버튼 - 분리 결과가 있거나 에러가 있을 때만 */}
                                {(hasSplitResult || hasError) ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      togglePassageExpand(key)
                                    }}
                                    className="text-muted-foreground hover:text-foreground p-0.5"
                                  >
                                    {isPassageExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="w-5" />
                                )}

                                <Checkbox
                                  checked={sheetSelected.includes(passage.number)}
                                  onCheckedChange={(e) => {
                                    e.stopPropagation?.()
                                    handleTogglePassage(sheet.sheetName, passage.number)
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                
                                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                
                                <span className={cn(
                                  "font-medium text-sm flex-1",
                                  hasError && "text-destructive"
                                )}>
                                  지문 {passage.number}
                                </span>
                                
                                {/* 매칭 표시 (업데이트 모드) */}
                                {matchInfo && (
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    matchInfo.passageMatch 
                                      ? "bg-blue-100 text-blue-700" 
                                      : "bg-green-100 text-green-700"
                                  )}>
                                    {matchInfo.passageMatch ? '🔄' : '✨'}
                                  </span>
                                )}
                                
                                {getSplitStatusIcon(key)}
                                
                                {splitResult?.splitResult && (
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    hasWarning ? "bg-amber-100 text-amber-700" :
                                    splitResult.splitResult.confidence >= 0.9 ? "bg-green-100 text-green-700" :
                                    splitResult.splitResult.confidence >= 0.7 ? "bg-yellow-100 text-yellow-700" : 
                                    "bg-orange-100 text-orange-700"
                                  )}>
                                    {hasWarning && <span className="mr-1">⚠️</span>}
                                    {splitResult.splitResult.sentences.length}문장
                                  </span>
                                )}
                                
                                {hasError && (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    실패
                                  </span>
                                )}
                              </div>

                              {/* 펼친 내용: 문장 목록 또는 에러 */}
                              {isPassageExpanded && (
                                <div className="border-t border-inherit">
                                  {/* 성공: 문장 목록 */}
                                  {hasSplitResult && splitResult.splitResult && (
                                    <div className={cn(
                                      "p-2 space-y-1 max-h-60 overflow-y-auto",
                                      hasWarning 
                                        ? "bg-gradient-to-b from-amber-50/50 to-white" 
                                        : "bg-gradient-to-b from-green-50/50 to-white"
                                    )}>
                                      {/* 한글 검토 필요 경고 */}
                                      {hasWarning && splitResult.splitResult.koreanIssues && (
                                        <div className="mb-2 p-2 bg-amber-100 rounded border border-amber-300 text-xs">
                                          <div className="flex items-center gap-1 font-medium text-amber-800 mb-1">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            한글 검토 필요 ({warningCount}건)
                                          </div>
                                          <ul className="text-amber-700 space-y-0.5 ml-4">
                                            {splitResult.splitResult.koreanIssues
                                              .filter(issue => issue.needsReview)
                                              .map((issue, idx) => (
                                                <li key={idx} className="list-disc">
                                                  {issue.description}
                                                </li>
                                              ))
                                            }
                                          </ul>
                                        </div>
                                      )}
                                      {splitResult.splitResult.sentences.map((sentence, idx) => (
                                        <div 
                                          key={idx} 
                                          className="flex items-start gap-2 p-2 bg-white rounded border border-green-100 text-xs"
                                        >
                                          <span className={cn(
                                            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                                            sentence.confidence >= 0.9 ? 'bg-green-100 text-green-700' :
                                            sentence.confidence >= 0.7 ? 'bg-yellow-100 text-yellow-700' : 
                                            'bg-orange-100 text-orange-700'
                                          )}>
                                            {sentence.no}
                                          </span>
                                          <div className="flex-1 min-w-0 space-y-1">
                                            <div className="text-gray-800 leading-relaxed line-clamp-2">
                                              {sentence.content}
                                            </div>
                                            {sentence.koreanTranslation && (
                                              <div className="text-gray-500 leading-relaxed line-clamp-2 pl-2 border-l-2 border-gray-200">
                                                {sentence.koreanTranslation}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* 실패: 에러 메시지 + 원문 미리보기 */}
                                  {hasError && (
                                    <div className="p-3 space-y-2 bg-red-50/50">
                                      <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                        <div className="text-xs text-red-700">
                                          {splitResult?.error}
                                        </div>
                                      </div>
                                      
                                      {/* 원문 미리보기 */}
                                      <div className="p-2 bg-white rounded border border-red-200 text-xs">
                                        <div className="text-gray-500 mb-1 font-medium">📝 원문:</div>
                                        <div className="text-gray-700 line-clamp-3">
                                          {passage.englishPassage}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 매칭 통계 (업데이트 모드) */}
          {updateMode !== 'new' && matchStats && getSelectedCount() > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex-shrink-0">
              <p className="text-sm font-medium text-blue-800 mb-2">📊 매칭 결과</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 text-blue-500" />
                  <span>덮어쓰기: {matchStats.matchedPassages}개 지문</span>
                </div>
                <div className="flex items-center gap-1">
                  <Plus className="w-3 h-3 text-green-500" />
                  <span>새로 추가: {matchStats.newPassages}개 지문</span>
                </div>
              </div>
            </div>
          )}

          {/* 등록/업데이트 버튼 */}
          <div className="mt-4 space-y-3 flex-shrink-0">
            <Button
              onClick={handleRegisterOrUpdate}
              disabled={getSelectedCount() === 0 || isRegistering || isSplitting || (updateMode !== 'new' && !onUpdate)}
              className={cn(
                'w-full h-12 text-base',
                getSelectedCount() > 0
                  ? updateMode === 'new' 
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {updateMode === 'new' ? '교재 등록 중...' : '교재 업데이트 중...'}
                </>
              ) : updateMode === 'new' ? (
                <>
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  교재 등록 ({getSelectedCount()}개 지문
                  {getSplitCount() > 0 && `, ${getTotalSentences()}개 문장`})
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  교재 업데이트 ({getSelectedCount()}개 지문
                  {matchStats && ` - 덮어쓰기 ${matchStats.matchedPassages}, 추가 ${matchStats.newPassages}`})
                </>
              )}
            </Button>

            {/* 분리 안내 */}
            {getSelectedCount() > 0 && getSplitCount() < getSelectedCount() && !isSplitting && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <p className="text-sm text-amber-800">
                  💡 우측 패널에서 <strong>문장 분리</strong>를 실행하세요
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
