'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Database, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDataGenerate } from '@/contexts/DataGenerateContext'

export function DataGenerator() {
  const {
    passages,
    isLoadingPassages,
    loadPassages,
    dataTypes,
    isLoadingDataTypes,
    loadDataTypes,
    selectedPassageIds,
    selectedDataTypeId,
    setSelectedDataTypeId,
    generationResults,
    isGenerating,
    generationProgress,
    handleGenerateSelected,
    handleRegenerateOne,
    togglePassage,
    toggleAllPassages,
    getSelectedCount,
    setSelectedResultKey,
  } = useDataGenerate()

  // 그룹별 확장 상태
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // 초기 로드
  useEffect(() => {
    loadPassages()
    loadDataTypes()
  }, [loadPassages, loadDataTypes])

  // 지문을 그룹 > 교재 > 단원 계층으로 정리
  const groupedPassages = passages.reduce((acc, passage) => {
    const groupName = passage.unit?.textbook?.group?.name || '기타'
    const textbookName = passage.unit?.textbook?.name || '기타'
    const unitName = passage.unit?.name || '기타'
    
    if (!acc[groupName]) acc[groupName] = {}
    if (!acc[groupName][textbookName]) acc[groupName][textbookName] = {}
    if (!acc[groupName][textbookName][unitName]) acc[groupName][textbookName][unitName] = []
    
    acc[groupName][textbookName][unitName].push(passage)
    return acc
  }, {} as Record<string, Record<string, Record<string, typeof passages>>>)

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  const getResultStatus = (passageId: string) => {
    if (!selectedDataTypeId) return null
    const key = `${passageId}-${selectedDataTypeId}`
    return generationResults[key]?.status
  }

  const getStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return null
    }
  }

  const selectedCount = getSelectedCount()
  const completedInSelection = selectedPassageIds.filter(id => getResultStatus(id) === 'completed').length
  const failedInSelection = selectedPassageIds.filter(id => getResultStatus(id) === 'failed').length

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-violet-600" />
          데이터 생성
        </h3>
      </div>

      {/* 데이터 유형 선택 */}
      <div className="border border-border rounded-lg p-4 bg-violet-50/50">
        <label className="block text-sm font-medium text-violet-900 mb-2">
          📊 데이터 유형 선택 *
        </label>
        
        {isLoadingDataTypes ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            로딩 중...
          </div>
        ) : dataTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            프롬프트가 연결된 데이터 유형이 없습니다.<br />
            설정 {">"} 데이터 유형에서 먼저 등록해주세요.
          </p>
        ) : (
          <Select
            value={selectedDataTypeId || ''}
            onValueChange={setSelectedDataTypeId}
            disabled={isGenerating}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="데이터 유형을 선택하세요..." />
            </SelectTrigger>
            <SelectContent>
              {dataTypes.map(dt => (
                <SelectItem key={dt.id} value={dt.id}>
                  <div className="flex items-center gap-2">
                    <span>{dt.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {dt.target === 'passage' ? '지문' : '문장'}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        dt.difficulty === 'simple' && 'bg-green-50 text-green-700',
                        dt.difficulty === 'medium' && 'bg-yellow-50 text-yellow-700',
                        dt.difficulty === 'complex' && 'bg-red-50 text-red-700',
                      )}
                    >
                      {dt.difficulty === 'simple' ? '단순' : dt.difficulty === 'medium' ? '중간' : '복잡'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 지문 선택 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedCount === passages.length && passages.length > 0}
              onCheckedChange={toggleAllPassages}
              disabled={isGenerating || passages.length === 0}
            />
            <span className="text-sm font-medium">
              지문 선택 ({selectedCount}/{passages.length})
            </span>
          </div>
          
          {selectedCount > 0 && selectedDataTypeId && (
            <div className="flex items-center gap-2 text-xs">
              {completedInSelection > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  ✅ {completedInSelection}
                </Badge>
              )}
              {failedInSelection > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700">
                  ❌ {failedInSelection}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="max-h-[400px] overflow-auto">
          {isLoadingPassages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">지문 로딩 중...</span>
            </div>
          ) : passages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">등록된 지문이 없습니다</p>
              <p className="text-xs">교재관리에서 먼저 지문을 등록해주세요</p>
            </div>
          ) : (
            <div className="divide-y">
              {Object.entries(groupedPassages).map(([groupName, textbooks]) => {
                const groupKey = `group-${groupName}`
                const isExpanded = expandedGroups[groupKey] !== false
                
                return (
                  <div key={groupName}>
                    {/* 그룹 헤더 */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupKey)}
                      className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{groupName}</span>
                      <Badge variant="outline" className="text-xs">그룹</Badge>
                    </button>
                    
                    {isExpanded && (
                      <div className="pl-4">
                        {Object.entries(textbooks).map(([textbookName, units]) => {
                          const textbookKey = `${groupKey}-${textbookName}`
                          const isTextbookExpanded = expandedGroups[textbookKey] !== false
                          
                          return (
                            <div key={textbookName}>
                              {/* 교재 헤더 */}
                              <button
                                type="button"
                                onClick={() => toggleGroup(textbookKey)}
                                className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left"
                              >
                                {isTextbookExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="text-sm">{textbookName}</span>
                                <Badge variant="outline" className="text-xs">교재</Badge>
                              </button>
                              
                              {isTextbookExpanded && (
                                <div className="pl-4">
                                  {Object.entries(units).map(([unitName, unitPassages]) => {
                                    const unitKey = `${textbookKey}-${unitName}`
                                    const isUnitExpanded = expandedGroups[unitKey] !== false
                                    
                                    return (
                                      <div key={unitName}>
                                        {/* 단원 헤더 */}
                                        <button
                                          type="button"
                                          onClick={() => toggleGroup(unitKey)}
                                          className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left"
                                        >
                                          {isUnitExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                          )}
                                          <span className="text-sm">{unitName}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {unitPassages.length}개 지문
                                          </Badge>
                                        </button>
                                        
                                        {isUnitExpanded && (
                                          <div className="pl-4">
                                            {unitPassages.map(passage => {
                                              const isSelected = selectedPassageIds.includes(passage.id)
                                              const status = getResultStatus(passage.id)
                                              const key = `${passage.id}-${selectedDataTypeId}`
                                              
                                              return (
                                                <div
                                                  key={passage.id}
                                                  className={cn(
                                                    'flex items-center gap-2 p-2 hover:bg-muted/30 rounded cursor-pointer',
                                                    isSelected && 'bg-violet-50'
                                                  )}
                                                  onClick={() => {
                                                    if (!isGenerating) togglePassage(passage.id)
                                                  }}
                                                >
                                                  <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => togglePassage(passage.id)}
                                                    disabled={isGenerating}
                                                  />
                                                  <span className="text-sm flex-1 truncate">
                                                    {passage.name}
                                                  </span>
                                                  
                                                  {/* 상태 아이콘 */}
                                                  {getStatusIcon(status)}
                                                  
                                                  {/* 재생성 버튼 */}
                                                  {status === 'failed' && !isGenerating && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 w-6 p-0"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleRegenerateOne(passage.id)
                                                      }}
                                                    >
                                                      <RefreshCw className="w-3 h-3" />
                                                    </Button>
                                                  )}
                                                  
                                                  {/* 결과 보기 */}
                                                  {status === 'completed' && (
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="h-6 px-2 text-xs"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedResultKey(key)
                                                      }}
                                                    >
                                                      보기
                                                    </Button>
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
          )}
        </div>
      </div>

      {/* 진행 상태 */}
      {isGenerating && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span className="font-medium text-blue-900">데이터 생성 중...</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ 
                width: `${generationProgress.total > 0 
                  ? (generationProgress.current / generationProgress.total) * 100 
                  : 0}%` 
              }}
            />
          </div>
          <p className="text-sm text-blue-700">
            {generationProgress.currentPassage || `${generationProgress.current}/${generationProgress.total}`}
          </p>
        </div>
      )}

      {/* 생성 버튼 */}
      <Button
        onClick={handleGenerateSelected}
        disabled={!selectedDataTypeId || selectedCount === 0 || isGenerating}
        className="w-full bg-violet-600 hover:bg-violet-700"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            생성 중...
          </>
        ) : (
          <>
            <Database className="w-4 h-4 mr-2" />
            선택된 지문 데이터 생성 ({selectedCount}개)
          </>
        )}
      </Button>

      {/* 조건 안내 */}
      {(!selectedDataTypeId || selectedCount === 0) && (
        <p className="text-xs text-center text-muted-foreground">
          {!selectedDataTypeId 
            ? '⬆️ 데이터 유형을 먼저 선택해주세요' 
            : '⬆️ 지문을 선택해주세요'}
        </p>
      )}
    </div>
  )
}



