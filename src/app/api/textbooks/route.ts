import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ParsedSentence } from '@/types'

// GET /api/textbooks - 모든 교재 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const includeSentences = searchParams.get('includeSentences') === 'true'
    
    let query = supabase
      .from('textbooks')
      .select(`
        *,
        units (
          *,
          passages (
            *
            ${includeSentences ? ', sentences (*)' : ''}
          )
        )
      `)
      .order('created_at', { ascending: true })
    
    if (groupId) {
      query = query.eq('group_id', groupId)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    
    // 서버에서 직접 정렬 (Supabase nested relation 정렬 제한 우회)
    interface PassageData {
      order_index?: number
      [key: string]: unknown
    }
    
    interface UnitData {
      order_index?: number
      passages?: PassageData[]
      [key: string]: unknown
    }
    
    interface TextbookData {
      units?: UnitData[]
      [key: string]: unknown
    }
    
    const sortedData = data?.map((textbook: TextbookData) => ({
      ...textbook,
      units: textbook.units
        ?.sort((a: UnitData, b: UnitData) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((unit: UnitData) => ({
          ...unit,
          passages: unit.passages?.sort((a: PassageData, b: PassageData) => 
            (a.order_index ?? 0) - (b.order_index ?? 0)
          )
        }))
    }))
    
    return NextResponse.json(sortedData)
  } catch (error) {
    console.error('Error fetching textbooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch textbooks' },
      { status: 500 }
    )
  }
}

// 지문 데이터 인터페이스
interface PassageInput {
  name: string
  content?: string
  koreanTranslation?: string
  sentences?: ParsedSentence[]
  splitModel?: string
  splitConfidence?: number
}

interface UnitInput {
  name: string
  passages?: PassageInput[]
}

// POST /api/textbooks - 새 교재 생성 (문장 포함)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    if (!body.name?.trim() || !body.group_id) {
      return NextResponse.json(
        { error: 'Textbook name and group_id are required' },
        { status: 400 }
      )
    }
    
    // 교재 생성
    const { data: textbook, error: textbookError } = await supabase
      .from('textbooks')
      .insert({
        name: body.name.trim(),
        group_id: body.group_id,
        google_sheet_url: body.google_sheet_url || null
      })
      .select()
      .single()
    
    if (textbookError) throw textbookError
    
    // 통계
    let totalUnits = 0
    let totalPassages = 0
    let totalSentences = 0
    
    // 단원과 지문이 있으면 함께 생성
    if (body.units && body.units.length > 0) {
      for (let i = 0; i < body.units.length; i++) {
        const unitData: UnitInput = body.units[i]
        
        const { data: unit, error: unitError } = await supabase
          .from('units')
          .insert({
            textbook_id: textbook.id,
            name: unitData.name,
            order_index: i
          })
          .select()
          .single()
        
        if (unitError) throw unitError
        totalUnits++
        
        // 지문 생성
        if (unitData.passages && unitData.passages.length > 0) {
          for (let j = 0; j < unitData.passages.length; j++) {
            const passageData = unitData.passages[j]
            
            // 문장 분리 상태 결정
            const hasSentences = passageData.sentences && passageData.sentences.length > 0
            const splitStatus = hasSentences ? 'completed' : 'pending'
            
            // 지문 저장
            const { data: passage, error: passageError } = await supabase
              .from('passages')
              .insert({
                unit_id: unit.id,
                name: passageData.name,
                content: passageData.content || null,
                korean_translation: passageData.koreanTranslation || null,
                order_index: j,
                sentence_split_status: splitStatus,
                sentence_count: passageData.sentences?.length || 0,
                split_model: passageData.splitModel || null,
                split_confidence: passageData.splitConfidence || null,
              })
              .select()
              .single()
            
            if (passageError) throw passageError
            totalPassages++
            
            // 문장 저장
            if (hasSentences && passage) {
              const sentencesData = passageData.sentences!.map((sentence: ParsedSentence) => ({
                passage_id: passage.id,
                sentence_no: sentence.no,
                content: sentence.content,
                korean_translation: sentence.koreanTranslation || null,
                word_count: sentence.wordCount,
                confidence: sentence.confidence,
                split_method: 'hybrid', // 기본값
              }))
              
              const { error: sentencesError } = await supabase
                .from('sentences')
                .insert(sentencesData)
              
              if (sentencesError) {
                console.error('Error inserting sentences:', sentencesError)
                // 문장 저장 실패해도 계속 진행 (경고만)
              } else {
                totalSentences += sentencesData.length
              }
            }
          }
        }
      }
    }
    
    // 생성된 교재 전체 데이터 조회
    const { data: result, error: resultError } = await supabase
      .from('textbooks')
      .select(`
        *,
        units (
          *,
          passages (
            *,
            sentences (*)
          )
        )
      `)
      .eq('id', textbook.id)
      .single()
    
    // 정렬 적용
    if (result && result.units) {
      result.units.sort((a: { order_index?: number }, b: { order_index?: number }) => 
        (a.order_index ?? 0) - (b.order_index ?? 0)
      )
      result.units.forEach((unit: { passages?: Array<{ order_index?: number }> }) => {
        unit.passages?.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
      })
    }
    
    if (resultError) throw resultError
    
    return NextResponse.json({
      ...result,
      stats: {
        units: totalUnits,
        passages: totalPassages,
        sentences: totalSentences,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating textbook:', error)
    return NextResponse.json(
      { error: 'Failed to create textbook' },
      { status: 500 }
    )
  }
}
