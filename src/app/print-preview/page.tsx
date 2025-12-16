/**
 * 인쇄 전용 페이지
 * 
 * sessionStorage에서 인쇄 데이터를 가져와 UnifiedRenderer로 렌더링합니다.
 * 페이지 로드 후 자동으로 인쇄 다이얼로그를 엽니다.
 */

'use client'

import { useEffect, useState } from 'react'
import { UnifiedRenderer } from '@/components/features/output'
import type { OutputConfig, ViewType } from '@/types/output-config'
import { DEFAULT_OUTPUT_CONFIG } from '@/types/output-config'

interface PrintData {
  questions: Array<{
    id: string
    [key: string]: unknown
  }>
  outputConfig: OutputConfig
  viewType: ViewType
}

export default function PrintPreviewPage() {
  const [data, setData] = useState<PrintData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    try {
      // sessionStorage에서 인쇄 데이터 가져오기
      const printDataStr = sessionStorage.getItem('printData')
      
      if (!printDataStr) {
        setError('인쇄할 데이터를 찾을 수 없습니다.')
        return
      }

      const printData: PrintData = JSON.parse(printDataStr)
      setData(printData)
      
      // 렌더링 완료 대기
      setTimeout(() => {
        setIsReady(true)
      }, 100)
    } catch (err) {
      console.error('Print preview error:', err)
      setError('인쇄 데이터를 불러오는 중 오류가 발생했습니다.')
    }
  }, [])

  // 렌더링 완료 후 인쇄 다이얼로그 자동 실행
  useEffect(() => {
    if (!isReady || !data || isPrinting) return

    // 이미지, 폰트 등 모든 리소스 로딩 대기
    if (document.readyState !== 'complete') {
      const handleLoad = () => {
        triggerPrint()
      }
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    } else {
      triggerPrint()
    }
  }, [isReady, data, isPrinting])

  const triggerPrint = () => {
    setIsPrinting(true)
    
    // 충분한 렌더링 시간 확보 (DOM + 스타일 적용)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print()
        }, 300)
      })
    })
  }

  // 인쇄 후 이벤트 처리
  useEffect(() => {
    const handleAfterPrint = () => {
      // sessionStorage 정리
      sessionStorage.removeItem('printData')
      
      // 인쇄 완료 후 창 닫기
      setTimeout(() => {
        window.close()
      }, 100)
    }

    const handleBeforePrint = () => {
      console.log('[Print] Print dialog opened')
    }

    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  // 로딩 중
  if (!data && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">인쇄 준비 중...</p>
        </div>
      </div>
    )
  }

  // 오류 발생
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            창 닫기
          </button>
        </div>
      </div>
    )
  }

  // 인쇄 미리보기 렌더링
  return (
    <div className="print-preview-page">
      {/* 인쇄 준비 중 오버레이 */}
      {!isReady && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 no-print">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">문서 준비 중...</p>
          </div>
        </div>
      )}
      
      {/* 실제 인쇄 콘텐츠 */}
      <UnifiedRenderer
        questions={data!.questions}
        outputConfig={data!.outputConfig || DEFAULT_OUTPUT_CONFIG}
        mode="print"
        viewType={data!.viewType || 'student'}
      />
    </div>
  )
}

