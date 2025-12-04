'use client'

import { ActiveTab, SettingMenu } from '@/types'

interface MainContentProps {
  activeTab: ActiveTab
  settingMenu: SettingMenu
  children?: React.ReactNode
}

export function MainContent({ activeTab, settingMenu, children }: MainContentProps) {
  const getTitle = () => {
    if (activeTab === '설정') {
      return `설정 > ${settingMenu}`
    }
    return activeTab
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 헤더 */}
      <div className="h-14 bg-white border-b border-border flex items-center px-6 shrink-0">
        <h2 className="text-lg font-semibold text-foreground">{getTitle()}</h2>
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

