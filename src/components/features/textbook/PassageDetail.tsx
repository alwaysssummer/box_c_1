'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Loader2, 
  ChevronLeft,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Sentence {
  id: string
  sentence_no: number
  content: string
  korean_translation: string | null
  word_count: number
  confidence: number
}

interface PassageData {
  id: string
  name: string
  content: string | null
  korean_translation: string | null
  sentence_split_status: string
  sentence_count: number
  sentences: Sentence[]
}

interface PassageDetailProps {
  passageId: string
  passageName: string
  unitName: string
  textbookName: string
  onBack: () => void
}

export function PassageDetail({ 
  passageId, 
  passageName, 
  unitName, 
  textbookName,
  onBack 
}: PassageDetailProps) {
  const [passage, setPassage] = useState<PassageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPassage = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/passages/${passageId}`)
        if (!response.ok) {
          throw new Error('지문을 불러올 수 없습니다')
        }
        
        const data = await response.json()
        setPassage(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPassage()
  }, [passageId])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-muted-foreground animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">지문 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 mx-auto text-destructive/50 mb-2" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            돌아가기
          </Button>
        </div>
      </div>
    )
  }

  if (!passage) {
    return null
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex-shrink-0 border-b border-border p-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {textbookName}
        </Button>
        
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">{passageName}</h2>
            <p className="text-sm text-muted-foreground">{unitName}</p>
          </div>
        </div>
        
        {/* 통계 */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            passage.sentence_split_status === 'completed' 
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          )}>
            {passage.sentence_split_status === 'completed' ? '✅ 분리 완료' : '⏳ 분리 대기'}
          </span>
          <span className="text-muted-foreground">
            {passage.sentence_count}개 문장
          </span>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* 문장 목록 */}
        {passage.sentences && passage.sentences.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              분리된 문장 ({passage.sentences.length}개)
            </h3>
            <div className="space-y-3">
              {passage.sentences
                .sort((a, b) => a.sentence_no - b.sentence_no)
                .map((sentence) => (
                <div 
                  key={sentence.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    sentence.confidence >= 0.9 ? "bg-white border-green-200" :
                    sentence.confidence >= 0.7 ? "bg-yellow-50 border-yellow-200" :
                    "bg-orange-50 border-orange-200"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold",
                      sentence.confidence >= 0.9 ? "bg-green-100 text-green-700" :
                      sentence.confidence >= 0.7 ? "bg-yellow-100 text-yellow-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {sentence.sentence_no}
                    </span>
                    <div className="flex-1 min-w-0">
                      {/* 영어 */}
                      <p className="text-foreground leading-relaxed">
                        {sentence.content}
                      </p>
                      {/* 한글 */}
                      {sentence.korean_translation && (
                        <p className="mt-2 text-muted-foreground text-sm pl-3 border-l-2 border-muted leading-relaxed">
                          {sentence.korean_translation}
                        </p>
                      )}
                    </div>
                    <span className={cn(
                      "flex-shrink-0 text-xs px-2 py-0.5 rounded",
                      sentence.confidence >= 0.9 ? "bg-green-100 text-green-700" :
                      sentence.confidence >= 0.7 ? "bg-yellow-100 text-yellow-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {Math.round(sentence.confidence * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">
              아직 문장 분리가 되지 않았습니다.
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              교재 등록 시 문장 분리를 실행하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}











