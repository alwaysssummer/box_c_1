'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { MainContent } from './MainContent'
import { RightPanel } from './RightPanel'
import { ActiveTab, SettingMenu } from '@/types'

interface AdminLayoutProps {
  sidebarContent?: React.ReactNode
  mainContent?: React.ReactNode
  rightPanelContent?: React.ReactNode
  rightPanelTitle?: string
}

export function AdminLayout({
  sidebarContent,
  mainContent,
  rightPanelContent,
  rightPanelTitle,
}: AdminLayoutProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('교재관리')
  const [settingMenu, setSettingMenu] = useState<SettingMenu>('데이터 유형')

  return (
    <div className="h-screen flex bg-muted/30">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settingMenu={settingMenu}
        setSettingMenu={setSettingMenu}
      >
        {sidebarContent}
      </Sidebar>

      <MainContent activeTab={activeTab} settingMenu={settingMenu}>
        {mainContent}
      </MainContent>

      <RightPanel title={rightPanelTitle}>
        {rightPanelContent}
      </RightPanel>
    </div>
  )
}

