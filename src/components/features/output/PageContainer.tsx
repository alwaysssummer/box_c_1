/**
 * 페이지 컨테이너
 * 
 * A4/B5 용지 크기에 맞는 페이지 컨테이너를 렌더링합니다.
 */

'use client'

import type { OutputConfig } from '@/types/output-config'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  pageNumber: number
  config: OutputConfig
  mode: 'preview' | 'print' | 'screen'
  children: React.ReactNode
}

export function PageContainer({
  pageNumber,
  config,
  mode,
  children,
}: PageContainerProps) {
  const { paper, options } = config

  // 용지 크기 및 방향 클래스
  const paperClass = `paper-${paper.size.toLowerCase()}-${paper.orientation}`

  // 페이지 번호 표시 여부
  const showPageNumber = options.pageNumbers && mode !== 'screen'
  const pageNumberPosition = options.pageNumberPosition || 'bottom-center'
  const pageNumberFormat = options.pageNumberFormat || 'number'

  // 페이지 번호 텍스트
  const getPageNumberText = () => {
    if (pageNumberFormat === 'number_of_total') {
      // 전체 페이지 수는 부모에서 전달받아야 하지만, 여기서는 현재 번호만 표시
      return `${pageNumber}`
    }
    return `${pageNumber}`
  }

  return (
    <div
      className={cn(
        'page-container',
        paperClass,
        `mode-${mode}`
      )}
      style={{
        paddingTop: `${paper.margins.top}mm`,
        paddingBottom: `${paper.margins.bottom}mm`,
        paddingLeft: `${paper.margins.left}mm`,
        paddingRight: `${paper.margins.right}mm`,
      }}
    >
      {/* 페이지 내용 */}
      <div className="page-content">
        {children}
      </div>

      {/* 페이지 번호 */}
      {showPageNumber && (
        <div className={cn('page-number', `position-${pageNumberPosition}`)}>
          {getPageNumberText()}
        </div>
      )}
    </div>
  )
}




