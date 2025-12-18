'use client'

import { cn } from '@/lib/utils'
import { ActiveTab, SettingMenu } from '@/types'

interface SidebarProps {
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  settingMenu: SettingMenu
  setSettingMenu: (menu: SettingMenu) => void
  children?: React.ReactNode
}

export function Sidebar({
  activeTab,
  setActiveTab,
  settingMenu,
  setSettingMenu,
  children,
}: SidebarProps) {
  return (
    <div className="w-56 h-full bg-white border-r border-border flex flex-col shrink-0">
      {/* 동적 콘텐츠 영역 (트리 등) */}
      <div className="flex-1 p-3 overflow-auto">
        {children}
      </div>
    </div>
  )
}

