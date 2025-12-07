'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, RotateCcw, Database, HelpCircle } from 'lucide-react'

interface DataTypeOption {
  id: string
  name: string
  category: string
}

interface QuestionTypeOption {
  id: string
  name: string
}

interface ManageFilterPanelProps {
  filterType: 'all' | 'dataType' | 'questionType'
  selectedTypeId: string
  statusFilter: 'all' | 'completed' | 'pending' | 'failed'
  onFilterTypeChange: (value: 'all' | 'dataType' | 'questionType') => void
  onSelectedTypeIdChange: (value: string) => void
  onStatusFilterChange: (value: 'all' | 'completed' | 'pending' | 'failed') => void
  onReset: () => void
}

export function ManageFilterPanel({
  filterType,
  selectedTypeId,
  statusFilter,
  onFilterTypeChange,
  onSelectedTypeIdChange,
  onStatusFilterChange,
  onReset,
}: ManageFilterPanelProps) {
  const [dataTypes, setDataTypes] = useState<DataTypeOption[]>([])
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 데이터 유형 및 문제 유형 로드
  useEffect(() => {
    const loadTypes = async () => {
      setIsLoading(true)
      try {
        const [dtRes, qtRes] = await Promise.all([
          fetch('/api/data-types'),
          fetch('/api/question-types'),
        ])
        
        if (dtRes.ok) {
          const dtData = await dtRes.json()
          setDataTypes(dtData)
        }
        
        if (qtRes.ok) {
          const qtData = await qtRes.json()
          setQuestionTypes(qtData)
        }
      } catch (error) {
        console.error('Failed to load types:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTypes()
  }, [])

  const isFiltered = filterType !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <Filter className="w-4 h-4 text-violet-600" />
          필터 조건
        </h4>
        {isFiltered && (
          <Badge variant="secondary" className="text-xs">
            필터 적용됨
          </Badge>
        )}
      </div>

      {/* 유형 선택 */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          유형 분류
        </label>
        <Select 
          value={filterType} 
          onValueChange={(v) => {
            onFilterTypeChange(v as 'all' | 'dataType' | 'questionType')
            onSelectedTypeIdChange('all')
          }}
        >
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="dataType">
              <span className="flex items-center gap-2">
                <Database className="w-3 h-3" />
                데이터 유형
              </span>
            </SelectItem>
            <SelectItem value="questionType">
              <span className="flex items-center gap-2">
                <HelpCircle className="w-3 h-3" />
                문제 유형
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 세부 유형 선택 */}
      {filterType !== 'all' && (
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            {filterType === 'dataType' ? '데이터 유형' : '문제 유형'}
          </label>
          <Select 
            value={selectedTypeId} 
            onValueChange={onSelectedTypeIdChange}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder={isLoading ? '로딩중...' : '전체'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {filterType === 'dataType' && dataTypes.map(dt => (
                <SelectItem key={dt.id} value={dt.id}>
                  <span className="flex items-center gap-2">
                    {dt.name}
                    <Badge variant="outline" className="text-xs ml-1">
                      {dt.category === 'base' ? '기본' : 'AI'}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
              {filterType === 'questionType' && questionTypes.map(qt => (
                <SelectItem key={qt.id} value={qt.id}>{qt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 상태 필터 */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          생성 상태
        </label>
        <Select 
          value={statusFilter} 
          onValueChange={(v) => onStatusFilterChange(v as 'all' | 'completed' | 'pending' | 'failed')}
        >
          <SelectTrigger className="bg-white">
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

      {/* 필터 초기화 */}
      {isFiltered && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onReset}
          className="w-full"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          필터 초기화
        </Button>
      )}

      {/* 안내 문구 */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        💡 필터를 적용하면 조건에 맞는 지문만 중앙 패널에 표시됩니다.
      </div>
    </div>
  )
}








