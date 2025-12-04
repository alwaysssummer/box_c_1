import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ParsedSentence } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

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
  passages: PassageInput[]
}

// PUT /api/textbooks/[id]/update - 교재 업데이트 (UPSERT)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: textbookId } = await params
    const supabase = await createClient()
    const body = await request.json()
    const { units } = body as { units: UnitInput[] }
    
    // 디버깅: 받은 데이터 로깅
    console.log('=== Textbook Update API ===')
    console.log('Textbook ID:', textbookId)
    units?.forEach((unit, uIdx) => {
      console.log(`Unit ${uIdx}: ${unit.name}`)
      unit.passages?.forEach((p, pIdx) => {
        console.log(`  Passage ${pIdx}: ${p.name}, sentences: ${p.sentences?.length || 0}`)
      })
    })

    if (!units || !Array.isArray(units)) {
      return NextResponse.json(
        { error: 'Units array is required' },
        { status: 400 }
      )
    }

    // 기존 교재 확인
    const { data: existingTextbook, error: textbookError } = await supabase
      .from('textbooks')
      .select(`
        *,
        units (
          *,
          passages (*)
        )
      `)
      .eq('id', textbookId)
      .single()

    if (textbookError || !existingTextbook) {
      return NextResponse.json(
        { error: 'Textbook not found' },
        { status: 404 }
      )
    }

    // 통계
    let updatedUnits = 0
    let newUnits = 0
    let updatedPassages = 0
    let newPassages = 0
    let updatedSentences = 0

    // 각 단원 처리
    for (const unitData of units) {
      // 기존 단원 찾기 (이름으로 매칭)
      const existingUnit = existingTextbook.units?.find(
        (u: { name: string }) => u.name === unitData.name
      )

      let unitId: string

      if (existingUnit) {
        // 기존 단원 업데이트 (필요시)
        unitId = existingUnit.id
        updatedUnits++
      } else {
        // 새 단원 생성
        const maxOrderIndex = existingTextbook.units?.reduce(
          (max: number, u: { order_index: number }) => Math.max(max, u.order_index || 0),
          -1
        ) ?? -1

        const { data: newUnit, error: unitError } = await supabase
          .from('units')
          .insert({
            textbook_id: textbookId,
            name: unitData.name,
            order_index: maxOrderIndex + 1
          })
          .select()
          .single()

        if (unitError) throw unitError
        unitId = newUnit.id
        newUnits++
      }

      // 각 지문 처리
      for (let j = 0; j < unitData.passages.length; j++) {
        const passageData = unitData.passages[j]

        // 기존 지문 찾기 (이름으로 매칭)
        const existingPassage = existingUnit?.passages?.find(
          (p: { name: string }) => p.name === passageData.name
        )

        const hasSentences = passageData.sentences && passageData.sentences.length > 0
        const splitStatus = hasSentences ? 'completed' : 'pending'

        let passageId: string

        if (existingPassage) {
          // 기존 지문 업데이트
          const { error: updateError } = await supabase
            .from('passages')
            .update({
              content: passageData.content || null,
              korean_translation: passageData.koreanTranslation || null,
              sentence_split_status: splitStatus,
              sentence_count: passageData.sentences?.length || 0,
              split_model: passageData.splitModel || null,
              split_confidence: passageData.splitConfidence || null,
            })
            .eq('id', existingPassage.id)

          if (updateError) throw updateError
          passageId = existingPassage.id
          updatedPassages++

          // 기존 문장 삭제 (새로 덮어쓰기)
          if (hasSentences) {
            await supabase
              .from('sentences')
              .delete()
              .eq('passage_id', passageId)
          }
        } else {
          // 새 지문 생성
          const maxPassageOrder = existingUnit?.passages?.reduce(
            (max: number, p: { order_index: number }) => Math.max(max, p.order_index || 0),
            -1
          ) ?? -1

          const { data: newPassage, error: passageError } = await supabase
            .from('passages')
            .insert({
              unit_id: unitId,
              name: passageData.name,
              content: passageData.content || null,
              korean_translation: passageData.koreanTranslation || null,
              order_index: maxPassageOrder + 1,
              sentence_split_status: splitStatus,
              sentence_count: passageData.sentences?.length || 0,
              split_model: passageData.splitModel || null,
              split_confidence: passageData.splitConfidence || null,
            })
            .select()
            .single()

          if (passageError) throw passageError
          passageId = newPassage.id
          newPassages++
        }

        // 문장 저장
        if (hasSentences && passageId) {
          console.log(`  Saving ${passageData.sentences!.length} sentences for passage ${passageId}`)
          
          const sentencesData = passageData.sentences!.map((sentence: ParsedSentence) => ({
            passage_id: passageId,
            sentence_no: sentence.no,
            content: sentence.content,
            korean_translation: sentence.koreanTranslation || null,
            word_count: sentence.wordCount,
            confidence: sentence.confidence,
            split_method: 'ai',
          }))

          console.log('  Sentences data:', JSON.stringify(sentencesData, null, 2))

          const { data: insertedData, error: sentencesError } = await supabase
            .from('sentences')
            .insert(sentencesData)
            .select()

          if (sentencesError) {
            console.error('  ❌ Error inserting sentences:', sentencesError)
          } else {
            console.log(`  ✅ Successfully inserted ${sentencesData.length} sentences`)
            updatedSentences += sentencesData.length
          }
        } else {
          console.log(`  ⚠️ No sentences to save for passage ${passageData.name}. hasSentences: ${hasSentences}, passageId: ${passageId}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        updatedUnits,
        newUnits,
        updatedPassages,
        newPassages,
        updatedSentences,
      }
    })
  } catch (error) {
    console.error('Error updating textbook:', error)
    return NextResponse.json(
      { error: 'Failed to update textbook' },
      { status: 500 }
    )
  }
}

