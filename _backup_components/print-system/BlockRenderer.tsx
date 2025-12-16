'use client'

/**
 * 블록 렌더러 - 각 블록 타입별 렌더링
 */

import React from 'react'
import { cn } from '@/lib/utils'
import type { Block, PrintStyle } from '@/lib/print-system'
import { getChoiceMarker } from '@/lib/print-system'

// ============================================
// Props 타입
// ============================================

interface BlockRendererProps {
  block: Block
  style: PrintStyle
  className?: string
}

// ============================================
// 메인 컴포넌트
// ============================================

export function BlockRenderer({ block, style, className }: BlockRendererProps) {
  switch (block.type) {
    case 'passage':
      return <PassageBlock block={block} style={style} className={className} />
    
    case 'question':
      return <QuestionBlock block={block} style={style} className={className} />
    
    case 'givenBox':
      return <GivenBoxBlock block={block} style={style} className={className} />
    
    case 'answer':
      return <AnswerBlock block={block} style={style} className={className} />
    
    case 'explanation':
      return <ExplanationBlock block={block} style={style} className={className} />
    
    case 'original':
    case 'translation':
    case 'vocabulary':
    case 'grammar':
    case 'structure':
      return <SentenceBlock block={block} style={style} className={className} />
    
    default:
      return <div className="text-red-500">Unknown block type: {block.type}</div>
  }
}

// ============================================
// 지문 블록
// ============================================

function PassageBlock({ block, style, className }: BlockRendererProps) {
  return (
    <div 
      className={cn(
        'print-block print-block-passage',
        'p-4 bg-slate-50 border border-slate-200 rounded-lg',
        className
      )}
      style={{ fontSize: `${style.fontSize}pt`, lineHeight: style.lineHeight }}
    >
      {block.data.passageName && (
        <div className="text-xs text-slate-500 mb-2">
          📄 {block.data.passageName}
        </div>
      )}
      <p className="whitespace-pre-wrap leading-relaxed">
        {block.data.body}
      </p>
    </div>
  )
}

// ============================================
// 문제 블록
// ============================================

function QuestionBlock({ block, style, className }: BlockRendererProps) {
  const { data } = block
  const choices = data.choices || []
  
  return (
    <div 
      className={cn(
        'print-block print-block-question',
        'space-y-3',
        className
      )}
      style={{ 
        fontSize: `${style.fontSize}pt`, 
        lineHeight: style.lineHeight,
        marginBottom: `${style.questionSpacing}px`,
      }}
    >
      {/* 지시문 */}
      {data.instruction && (
        <div className="font-medium">
          {data.questionNumber && (
            <span className="mr-2 text-blue-600">{data.questionNumber}.</span>
          )}
          {data.instruction}
        </div>
      )}
      
      {/* 본문 (지문이 없을 때) */}
      {data.body && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded">
          <p className="whitespace-pre-wrap">{data.body}</p>
        </div>
      )}
      
      {/* 선택지 */}
      {choices.length > 0 && (
        <div className={cn(
          style.choiceLayout === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-1'
        )}>
          {choices.map((choice, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="font-medium text-slate-600 shrink-0">
                {getChoiceMarker(index, style.choiceMarker)}
              </span>
              <span>{choice}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* 정답 (포함된 경우) */}
      {data.answer !== undefined && (
        <div className="pt-2 border-t border-dashed border-slate-300">
          <span className="text-sm text-blue-600 font-medium">
            정답: {data.answer}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// 주어진 글 블록 (순서/삽입용)
// ============================================

function GivenBoxBlock({ block, style, className }: BlockRendererProps) {
  return (
    <div 
      className={cn(
        'print-block print-block-givenbox',
        'p-4 border-2 border-dashed border-blue-400 bg-blue-50/50 rounded-lg',
        className
      )}
      style={{ fontSize: `${style.fontSize}pt`, lineHeight: style.lineHeight }}
    >
      <div className="text-xs font-semibold text-blue-600 mb-2">
        【주어진 글】
      </div>
      <p className="whitespace-pre-wrap">
        {block.data.givenBoxContent || block.data.body}
      </p>
    </div>
  )
}

// ============================================
// 정답 블록
// ============================================

function AnswerBlock({ block, style, className }: BlockRendererProps) {
  return (
    <div 
      className={cn(
        'print-block print-block-answer',
        'p-3 bg-green-50 border border-green-200 rounded',
        className
      )}
      style={{ fontSize: `${style.fontSize}pt` }}
    >
      <span className="font-medium text-green-700">
        정답: {block.data.answer}
      </span>
    </div>
  )
}

// ============================================
// 해설 블록
// ============================================

function ExplanationBlock({ block, style, className }: BlockRendererProps) {
  return (
    <div 
      className={cn(
        'print-block print-block-explanation',
        'p-3 bg-amber-50 border border-amber-200 rounded',
        className
      )}
      style={{ fontSize: `${style.fontSize}pt`, lineHeight: style.lineHeight }}
    >
      <div className="text-xs font-semibold text-amber-600 mb-1">
        【해설】
      </div>
      <p className="whitespace-pre-wrap text-sm">
        {block.data.explanationText}
      </p>
    </div>
  )
}

// ============================================
// 문장형 블록
// ============================================

function SentenceBlock({ block, style, className }: BlockRendererProps) {
  const sentences = block.data.sentences || []
  
  const getBlockTitle = () => {
    switch (block.type) {
      case 'original': return '【원문】'
      case 'translation': return '【해석】'
      case 'vocabulary': return '【어휘】'
      case 'grammar': return '【문법】'
      case 'structure': return '【구문】'
      default: return ''
    }
  }
  
  const getBlockColor = () => {
    switch (block.type) {
      case 'original': return 'bg-blue-50 border-blue-200'
      case 'translation': return 'bg-amber-50 border-amber-200'
      case 'vocabulary': return 'bg-green-50 border-green-200'
      case 'grammar': return 'bg-purple-50 border-purple-200'
      case 'structure': return 'bg-pink-50 border-pink-200'
      default: return 'bg-slate-50 border-slate-200'
    }
  }
  
  return (
    <div 
      className={cn(
        'print-block print-block-sentence',
        'p-3 border rounded',
        getBlockColor(),
        className
      )}
      style={{ fontSize: `${style.fontSize}pt`, lineHeight: style.lineHeight }}
    >
      <div className="text-xs font-semibold text-slate-600 mb-2">
        {getBlockTitle()}
      </div>
      
      <div className="space-y-2">
        {sentences.map((sentence, index) => (
          <div key={index} className="flex gap-2">
            <span className="text-xs text-slate-400 shrink-0 w-5">
              {sentence.sentenceNo || index + 1}.
            </span>
            <div className="flex-1">
              {block.type === 'original' && sentence.original}
              {block.type === 'translation' && sentence.translation}
              {block.type === 'vocabulary' && (
                <div className="space-y-1">
                  {sentence.vocabulary?.map((v, i) => (
                    <div key={i}>
                      <span className="font-medium">{v.word}</span>
                      <span className="text-slate-500"> : {v.meaning}</span>
                    </div>
                  ))}
                </div>
              )}
              {block.type === 'grammar' && sentence.grammar}
              {block.type === 'structure' && sentence.structure}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

