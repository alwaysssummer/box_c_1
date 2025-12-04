'use client'

import { ActiveTab, SettingMenu } from '@/types'
import { cn } from '@/lib/utils'

// 교재관리 서브 모드
export type ContentMode = '문장분리' | '데이터 생성' | '문제 생성'

interface MainContentProps {
  activeTab: ActiveTab
  settingMenu: SettingMenu
  // 교재관리 서브 모드 (선택적)
  contentMode?: ContentMode
  onContentModeChange?: (mode: ContentMode) => void
  children?: React.ReactNode
}

export function MainContent({ 
  activeTab, 
  settingMenu, 
  contentMode,
  onContentModeChange,
  children 
}: MainContentProps) {
  const getTitle = () => {
    if (activeTab === '설정') {
      return `설정 > ${settingMenu}`
    }
    return activeTab
  }

  const contentModes: ContentMode[] = ['문장분리', '데이터 생성', '문제 생성']

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 헤더 */}
      <div className="h-14 bg-white border-b border-border flex items-center px-6 shrink-0">
        <h2 className="text-lg font-semibold text-foreground">{getTitle()}</h2>
        
        {/* 교재관리 서브 탭 */}
        {activeTab === '교재관리' && onContentModeChange && (
          <div className="ml-6 flex items-center gap-1">
            {contentModes.map((mode) => (
              <button
                key={mode}
                onClick={() => onContentModeChange(mode)}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                  contentMode === mode
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 p-6 overflow-auto bg-muted/30">
        <div className="bg-white rounded-lg border border-border h-full p-6 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
