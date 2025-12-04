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

const tabs: ActiveTab[] = ['회원관리', '교재관리', '설정']
const settingMenus: SettingMenu[] = ['프롬프트', '데이터 유형', '문제 유형', '설정']

export function Sidebar({
  activeTab,
  setActiveTab,
  settingMenu,
  setSettingMenu,
  children,
}: SidebarProps) {
  return (
    <div className="w-[336px] bg-white border-r border-border flex flex-col">
      {/* 탭 메뉴 */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === tab
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 p-3 overflow-auto">
        {activeTab === '설정' && (
          <div className="space-y-1 mb-3">
            {settingMenus.map((menu) => (
              <button
                key={menu}
                onClick={() => setSettingMenu(menu)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                  settingMenu === menu
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {menu}
              </button>
            ))}
          </div>
        )}

        {/* 동적 콘텐츠 영역 */}
        {children}
      </div>
    </div>
  )
}

