'use client'

import { cn } from '@/lib/utils'
import { ActiveTab } from '@/types'

interface HeaderProps {
  activeTab: ActiveTab
  onTabChange: (tab: ActiveTab) => void
}

const tabs: ActiveTab[] = ['회원관리', '교재관리', '설정']

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-border flex items-center px-6 shrink-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-foreground">📚 대시보드</h1>
        
        <nav className="flex gap-1 ml-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                activeTab === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}




