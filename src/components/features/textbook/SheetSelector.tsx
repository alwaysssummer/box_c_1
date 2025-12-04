'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ChevronRight, 
  ChevronDown, 
  Loader2, 
  FileSpreadsheet, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSheetImport } from '@/contexts/SheetImportContext'

interface SheetSelectorProps {
  groupName: string
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
}

export function SheetSelector({ groupName, onRegister }: SheetSelectorProps) {
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
    getAIErrorCount,
  } = useSheetImport()

  const [isRegistering, setIsRegistering] = React.useState(false)
  const [expandedPassages, setExpandedPassages] = React.useState<Record<string, boolean>>({})

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

  // 교재 등록
  const handleRegister = async () => {
    if (!sheetInfo || getSelectedCount() === 0 || isRegistering) return

    setIsRegistering(true)
    try {
      const units = Object.entries(selectedItems).map(([sheetName, passageNumbers]) => {
        const sheet = sheetInfo.sheets.find(s => s.sheetName === sheetName)
        const passages = passageNumbers.map((num) => {
          const passage = sheet?.passages.find(p => p.number === num)
          const key = `${sheetName}-${num}`
          const splitResult = splitResults[key]

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

      await onRegister({
        name: sheetInfo.fileName,
        units,
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const totalPassages = sheetInfo?.sheets.reduce((sum, s) => sum + s.passages.length, 0) || 0

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 flex-shrink-0">
        📁 {groupName} - 교재 등록
      </h3>

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

          {/* 분리 상태 요약 */}
          {getSplitCount() > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {getSplitCount()}개 분리 완료 ({getTotalSentences()}문장)
                  </span>
                </div>
                {getAIErrorCount() > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    ❌ {getAIErrorCount()}개 실패
                  </span>
                )}
              </div>
            </div>
          )}

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
                        {splitCountInSheet > 0 && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            ✅ {splitCountInSheet}
                          </span>
                        )}
                        {warningCountInSheet > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            ⚠️ {warningCountInSheet}
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
                        {sheet.passages.map((passage) => {
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

                          return (
                            <div 
                              key={passage.number}
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

          {/* 등록 버튼 */}
          <div className="mt-4 space-y-3 flex-shrink-0">
            <Button
              onClick={handleRegister}
              disabled={getSelectedCount() === 0 || isRegistering || isSplitting}
              className={cn(
                'w-full h-12 text-base',
                getSelectedCount() > 0
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  교재 등록 중...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-5 h-5 mr-2" />
                  교재 등록 ({getSelectedCount()}개 지문
                  {getSplitCount() > 0 && `, ${getTotalSentences()}개 문장`})
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

import React from 'react'

