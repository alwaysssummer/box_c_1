'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, RotateCcw, Loader2 } from 'lucide-react'

// 시스템 기본값 타입 (레거시 호환용)
interface SystemDefaults {
  fontSize: number
  lineHeight: number
  padding: { top: number; bottom: number; left: number; right: number }
  columnGap: number
  questionSpacing: number
  choiceMarker: string
  breakMode: string
}

const DEFAULT_VALUES: SystemDefaults = {
  fontSize: 9,
  lineHeight: 1.6,
  padding: { top: 15, bottom: 15, left: 15, right: 15 },
  columnGap: 24,
  questionSpacing: 16,
  choiceMarker: 'circle',
  breakMode: 'protect-passage',
}

export function SystemDefaultsForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [values, setValues] = useState<SystemDefaults>(DEFAULT_VALUES)
  const [hasChanges, setHasChanges] = useState(false)

  // 설정 불러오기
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/system-settings?key=template_defaults')
      if (res.ok) {
        const data = await res.json()
        if (data.value) {
          setValues(data.value as SystemDefaults)
        }
      }
    } catch (error) {
      console.error('설정 불러오기 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 설정 저장
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'template_defaults',
          value: values,
          description: '출력 템플릿 시스템 기본값',
        }),
      })

      if (!res.ok) throw new Error('저장 실패')

      setHasChanges(false)
      alert('저장되었습니다.')
    } catch (error) {
      console.error('설정 저장 오류:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 기본값으로 초기화
  const handleReset = () => {
    if (confirm('모든 설정을 기본값으로 초기화하시겠습니까?')) {
      setValues(DEFAULT_VALUES)
      setHasChanges(true)
    }
  }

  // 값 변경 핸들러
  const updateValue = <K extends keyof SystemDefaults>(key: K, value: SystemDefaults[K]) => {
    setValues(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const updatePadding = (side: 'top' | 'bottom' | 'left' | 'right', value: number) => {
    setValues(prev => ({
      ...prev,
      padding: { ...prev.padding, [side]: value }
    }))
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">시스템 기본값</h3>
          <p className="text-sm text-slate-500 mt-1">
            모든 출력 템플릿에 적용되는 글로벌 기본값입니다.
            <br />
            개별 템플릿에서 오버라이드할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-slate-600"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            초기화
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* 폼 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 글자 크기 */}
        <div className="space-y-2">
          <Label>기본 글자 크기 (pt)</Label>
          <Input
            type="number"
            min={7}
            max={14}
            value={values.fontSize}
            onChange={e => updateValue('fontSize', parseInt(e.target.value) || 9)}
            className="w-full"
          />
          <p className="text-xs text-slate-500">권장: 9pt (7-12pt 범위)</p>
        </div>

        {/* 줄간격 */}
        <div className="space-y-2">
          <Label>줄간격 (배수)</Label>
          <Input
            type="number"
            min={1}
            max={2.5}
            step={0.1}
            value={values.lineHeight}
            onChange={e => updateValue('lineHeight', parseFloat(e.target.value) || 1.6)}
            className="w-full"
          />
          <p className="text-xs text-slate-500">권장: 1.6 (1.4-2.0 범위)</p>
        </div>

        {/* 단 간격 */}
        <div className="space-y-2">
          <Label>단 사이 간격 (px)</Label>
          <Input
            type="number"
            min={12}
            max={48}
            value={values.columnGap}
            onChange={e => updateValue('columnGap', parseInt(e.target.value) || 24)}
            className="w-full"
          />
          <p className="text-xs text-slate-500">2단 레이아웃 시 좌/우 열 간격</p>
        </div>

        {/* 문제 간격 */}
        <div className="space-y-2">
          <Label>문제 사이 간격 (px)</Label>
          <Input
            type="number"
            min={8}
            max={32}
            value={values.questionSpacing}
            onChange={e => updateValue('questionSpacing', parseInt(e.target.value) || 16)}
            className="w-full"
          />
          <p className="text-xs text-slate-500">문제와 문제 사이의 수직 간격</p>
        </div>
      </div>

      {/* 여백 설정 */}
      <div className="space-y-3">
        <Label>페이지 여백 (mm)</Label>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">상단</Label>
            <Input
              type="number"
              min={5}
              max={30}
              value={values.padding.top}
              onChange={e => updatePadding('top', parseInt(e.target.value) || 15)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">하단</Label>
            <Input
              type="number"
              min={5}
              max={30}
              value={values.padding.bottom}
              onChange={e => updatePadding('bottom', parseInt(e.target.value) || 15)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">좌측</Label>
            <Input
              type="number"
              min={5}
              max={30}
              value={values.padding.left}
              onChange={e => updatePadding('left', parseInt(e.target.value) || 15)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">우측</Label>
            <Input
              type="number"
              min={5}
              max={30}
              value={values.padding.right}
              onChange={e => updatePadding('right', parseInt(e.target.value) || 15)}
            />
          </div>
        </div>
      </div>

      {/* 선택지 마커 */}
      <div className="space-y-2">
        <Label>기본 선택지 마커</Label>
        <div className="flex gap-3">
          {[
            { value: 'circle', label: '①②③④⑤' },
            { value: 'bracket', label: '(1)(2)(3)(4)(5)' },
            { value: 'number', label: '1. 2. 3. 4. 5.' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="choiceMarker"
                value={opt.value}
                checked={values.choiceMarker === opt.value}
                onChange={e => updateValue('choiceMarker', e.target.value as SystemDefaults['choiceMarker'])}
                className="text-blue-600"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 페이지 나눔 모드 */}
      <div className="space-y-2">
        <Label>기본 페이지 나눔 모드</Label>
        <div className="flex gap-4">
          {[
            { value: 'protect-passage', label: '지문 보호', desc: '지문은 끊기지 않음' },
            { value: 'free-flow', label: '자유 흐름', desc: '어디서든 끊길 수 있음' },
          ].map(opt => (
            <label key={opt.value} className="flex items-start gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 flex-1">
              <input
                type="radio"
                name="breakMode"
                value={opt.value}
                checked={values.breakMode === opt.value}
                onChange={e => updateValue('breakMode', e.target.value as SystemDefaults['breakMode'])}
                className="text-blue-600 mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">{opt.label}</span>
                <p className="text-xs text-slate-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 변경 알림 */}
      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          ⚠️ 변경사항이 있습니다. 저장 버튼을 눌러 적용하세요.
        </div>
      )}
    </div>
  )
}




