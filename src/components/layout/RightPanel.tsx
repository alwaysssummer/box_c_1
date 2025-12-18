'use client'

interface RightPanelProps {
  title?: string
  children?: React.ReactNode
}

export function RightPanel({ title = '확장 기능', children }: RightPanelProps) {
  return (
    <div className="w-72 h-full bg-white border-l border-border flex flex-col shrink-0">
      {/* 헤더 */}
      <div className="h-14 border-b border-border flex items-center px-4 shrink-0 z-10">
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 p-4 overflow-auto">
        {children || (
          <p className="text-muted-foreground text-sm">
            현재 작업과 관련된 확장 기능이 여기에 표시됩니다.
          </p>
        )}
      </div>
    </div>
  )
}

