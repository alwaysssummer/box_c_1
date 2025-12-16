'use client'

/**
 * 페이지 렌더러 - 단일 페이지 렌더링
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { PrintPage, PrintLayout, PrintStyle, PassageLayout, SentenceLayout, Block } from '@/lib/print-system'
import { BlockRenderer } from './BlockRenderer'

// ============================================
// Props 타입
// ============================================

interface PageRendererProps {
  page: PrintPage
  layout: PrintLayout
  style: PrintStyle
  className?: string
}

// ============================================
// 메인 컴포넌트
// ============================================

export function PageRenderer({ page, layout, style, className }: PageRendererProps) {
  return (
    <div
      className={cn(
        'print-page',
        'bg-white shadow-lg',
        'relative overflow-hidden',
        className
      )}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: `${style.padding.top}mm ${style.padding.right}mm ${style.padding.bottom}mm ${style.padding.left}mm`,
        transform: page.scale < 1 ? `scale(${page.scale})` : undefined,
        transformOrigin: 'top left',
      }}
    >
      {/* 페이지 번호 */}
      <div className="absolute bottom-4 right-4 text-xs text-slate-400">
        {page.pageNumber}
      </div>
      
      {/* 콘텐츠 */}
      <div className="print-page-content h-full">
        {layout.category === 'passage' ? (
          <PassagePageContent 
            page={page} 
            layout={layout as PassageLayout} 
            style={style} 
          />
        ) : (
          <SentencePageContent 
            page={page} 
            layout={layout as SentenceLayout} 
            style={style} 
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// 지문형 페이지 콘텐츠
// ============================================

interface PassagePageContentProps {
  page: PrintPage
  layout: PassageLayout
  style: PrintStyle
}

function PassagePageContent({ page, layout, style }: PassagePageContentProps) {
  const { blocks } = page
  const { columns, passagePosition } = layout
  
  // 1단 레이아웃
  if (columns === 1) {
    return (
      <div className="space-y-4">
        {blocks.map(block => (
          <BlockRenderer key={block.id} block={block} style={style} />
        ))}
      </div>
    )
  }
  
  // 2단 레이아웃
  if (passagePosition === 'top') {
    // 지문 상단, 문제들 하단 2열
    const passageBlocks = blocks.filter(b => b.type === 'passage' || b.type === 'givenBox')
    const otherBlocks = blocks.filter(b => b.type !== 'passage' && b.type !== 'givenBox')
    
    return (
      <div className="h-full flex flex-col">
        {/* 상단: 지문 */}
        {passageBlocks.length > 0 && (
          <div className="mb-4">
            {passageBlocks.map(block => (
              <BlockRenderer key={block.id} block={block} style={style} />
            ))}
          </div>
        )}
        
        {/* 하단: 문제들 (2열) */}
        <div 
          className="flex-1 grid grid-cols-2"
          style={{ gap: `${style.columnGap}px` }}
        >
          {distributeToColumns(otherBlocks, 2).map((columnBlocks, colIndex) => (
            <div key={colIndex} className="space-y-4">
              {columnBlocks.map(block => (
                <BlockRenderer key={block.id} block={block} style={style} />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  // 블록의 position 속성으로 좌/우 분리
  const hasPositionedBlocks = blocks.some(b => b.position === 'left' || b.position === 'right')
  
  if (hasPositionedBlocks) {
    // position 기반 분리 (프레임 설정 사용)
    const leftBlocks = blocks.filter(b => b.position === 'left')
    const rightBlocks = blocks.filter(b => b.position === 'right')
    const fullBlocks = blocks.filter(b => b.position === 'full')
    
    return (
      <div className="h-full flex flex-col">
        {/* 좌우 2열 */}
        <div 
          className="flex-1 grid grid-cols-2"
          style={{ gap: `${style.columnGap}px` }}
        >
          {/* 좌측 */}
          <div className="space-y-4">
            {leftBlocks.map(block => (
              <BlockRenderer key={block.id} block={block} style={style} />
            ))}
          </div>
          
          {/* 우측 */}
          <div className="space-y-4">
            {rightBlocks.map(block => (
              <BlockRenderer key={block.id} block={block} style={style} />
            ))}
          </div>
        </div>
        
        {/* 전체 너비 블록 (해설 등) */}
        {fullBlocks.length > 0 && (
          <div className="mt-4 space-y-4">
            {fullBlocks.map(block => (
              <BlockRenderer key={block.id} block={block} style={style} />
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // 기존 로직: 타입 기반 분리 (지문 좌측, 문제들 우측)
  const passageBlocks = blocks.filter(b => b.type === 'passage' || b.type === 'givenBox')
  const otherBlocks = blocks.filter(b => b.type !== 'passage' && b.type !== 'givenBox')
  
  return (
    <div 
      className="h-full grid grid-cols-2"
      style={{ gap: `${style.columnGap}px` }}
    >
      {/* 좌측: 지문 */}
      <div className="space-y-4">
        {passageBlocks.map(block => (
          <BlockRenderer key={block.id} block={block} style={style} />
        ))}
      </div>
      
      {/* 우측: 문제들 */}
      <div className="space-y-4">
        {otherBlocks.map(block => (
          <BlockRenderer key={block.id} block={block} style={style} />
        ))}
      </div>
    </div>
  )
}

// ============================================
// 문장형 페이지 콘텐츠
// ============================================

interface SentencePageContentProps {
  page: PrintPage
  layout: SentenceLayout
  style: PrintStyle
}

function SentencePageContent({ page, layout, style }: SentencePageContentProps) {
  const { blocks } = page
  const { frame, showSentenceNumber } = layout
  const { merge, cells } = frame
  
  // 프레임 병합에 따른 그리드 구성
  const gridTemplate = getGridTemplate(merge)
  
  // 각 셀에 해당하는 블록 찾기
  const getBlockForCell = (position: 'A' | 'B' | 'C' | 'D') => {
    const blockType = cells[position]
    if (!blockType) return null
    return blocks.find(b => b.type === blockType)
  }
  
  return (
    <div 
      className="h-full grid"
      style={{ 
        gridTemplateColumns: gridTemplate.columns,
        gridTemplateRows: gridTemplate.rows,
        gap: '16px',
      }}
    >
      {/* A 셀 */}
      {!isHidden('A', merge) && (
        <div 
          className={cn(
            'print-frame-cell',
            getCellGridArea('A', merge),
          )}
        >
          {getBlockForCell('A') && (
            <BlockRenderer 
              block={getBlockForCell('A')!} 
              style={style} 
            />
          )}
        </div>
      )}
      
      {/* B 셀 */}
      {!isHidden('B', merge) && (
        <div 
          className={cn(
            'print-frame-cell',
            getCellGridArea('B', merge),
          )}
        >
          {getBlockForCell('B') && (
            <BlockRenderer 
              block={getBlockForCell('B')!} 
              style={style} 
            />
          )}
        </div>
      )}
      
      {/* C 셀 */}
      {!isHidden('C', merge) && (
        <div 
          className={cn(
            'print-frame-cell',
            getCellGridArea('C', merge),
          )}
        >
          {getBlockForCell('C') && (
            <BlockRenderer 
              block={getBlockForCell('C')!} 
              style={style} 
            />
          )}
        </div>
      )}
      
      {/* D 셀 */}
      {!isHidden('D', merge) && (
        <div 
          className={cn(
            'print-frame-cell',
            getCellGridArea('D', merge),
          )}
        >
          {getBlockForCell('D') && (
            <BlockRenderer 
              block={getBlockForCell('D')!} 
              style={style} 
            />
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 블록들을 열에 분배
 */
function distributeToColumns(blocks: Block[], columnCount: number) {
  const columns: Block[][] = Array.from({ length: columnCount }, () => [])
  
  blocks.forEach((block, index) => {
    // 라운드 로빈 방식으로 분배
    columns[index % columnCount].push(block)
  })
  
  return columns
}

/**
 * 병합 설정에 따른 그리드 템플릿
 */
function getGridTemplate(merge?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }) {
  if (!merge) {
    return { columns: '1fr 1fr', rows: '1fr 1fr' }
  }
  
  if (merge.left && merge.right) {
    // 전체 병합
    return { columns: '1fr', rows: '1fr' }
  }
  
  if (merge.top && merge.bottom) {
    // 좌우 병합
    return { columns: '1fr 1fr', rows: '1fr' }
  }
  
  if (merge.left) {
    return { columns: '1fr 1fr', rows: '1fr 1fr' }
  }
  
  if (merge.right) {
    return { columns: '1fr 1fr', rows: '1fr 1fr' }
  }
  
  if (merge.top) {
    return { columns: '1fr 1fr', rows: '1fr 1fr' }
  }
  
  if (merge.bottom) {
    return { columns: '1fr 1fr', rows: '1fr 1fr' }
  }
  
  return { columns: '1fr 1fr', rows: '1fr 1fr' }
}

/**
 * 셀이 병합으로 숨겨져야 하는지 확인
 */
function isHidden(position: 'A' | 'B' | 'C' | 'D', merge?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }): boolean {
  if (!merge) return false
  
  // top 병합: B는 숨김
  if (merge.top && position === 'B') return true
  
  // bottom 병합: D는 숨김
  if (merge.bottom && position === 'D') return true
  
  // left 병합: C는 숨김
  if (merge.left && position === 'C') return true
  
  // right 병합: D는 숨김 (B+D)
  if (merge.right && position === 'D') return true
  
  return false
}

/**
 * 셀의 그리드 영역 클래스
 */
function getCellGridArea(position: 'A' | 'B' | 'C' | 'D', merge?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean }): string {
  if (!merge) return ''
  
  // A 셀이 상단 병합되면 col-span-2
  if (position === 'A' && merge.top) {
    return 'col-span-2'
  }
  
  // A 셀이 좌측 병합되면 row-span-2
  if (position === 'A' && merge.left) {
    return 'row-span-2'
  }
  
  // C 셀이 하단 병합되면 col-span-2
  if (position === 'C' && merge.bottom) {
    return 'col-span-2'
  }
  
  // B 셀이 우측 병합되면 row-span-2
  if (position === 'B' && merge.right) {
    return 'row-span-2'
  }
  
  return ''
}

