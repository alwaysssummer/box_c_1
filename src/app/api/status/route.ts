import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 내부 타입 정의 (Supabase 쿼리 응답용)
interface PassageRow {
  id: string
  name: string
  order_index: number
  sentence_split_status: string | null
  sentence_count: number | null
}

interface UnitRow {
  id: string
  name: string
  order_index: number
  passages: PassageRow[]
}

interface TextbookRow {
  id: string
  name: string
  order_index: number
  units: UnitRow[]
}

interface GroupRow {
  id: string
  name: string
  order_index: number
  textbooks: TextbookRow[]
}

// 출력 타입 (reduce 연산용)
interface OutputUnit {
  id: string
  name: string
  orderIndex: number
  passageCount: number
  passages: unknown[]
}

interface OutputTextbook {
  id: string
  name: string
  orderIndex: number
  unitCount: number
  passageCount: number
  units: OutputUnit[]
}

// GET /api/status - 전체 현황 조회
export async function GET() {
  try {
    const supabase = await createClient()

    // 1. 그룹별 통계
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select(`
        id,
        name,
        order_index,
        textbooks (
          id,
          name,
          order_index,
          units (
            id,
            name,
            order_index,
            passages (
              id,
              name,
              order_index,
              sentence_split_status,
              sentence_count
            )
          )
        )
      `)
      .order('order_index', { ascending: true })

    if (groupsError) throw groupsError

    // 2. 생성된 데이터 현황 조회
    const { data: generatedData, error: generatedError } = await supabase
      .from('generated_data')
      .select('passage_id, data_type_id, status')

    if (generatedError) throw generatedError

    // 3. 데이터 유형 목록 조회
    const { data: dataTypes, error: dataTypesError } = await supabase
      .from('data_types')
      .select('id, name, category')

    if (dataTypesError) throw dataTypesError

    // 4. 문제 유형 목록 조회
    const { data: questionTypes, error: questionTypesError } = await supabase
      .from('question_types')
      .select('id, name')

    if (questionTypesError) throw questionTypesError

    // 5. 생성된 문제 현황 조회
    const { data: generatedQuestions, error: generatedQuestionsError } = await supabase
      .from('generated_questions')
      .select('passage_id, question_type_id, status')

    if (generatedQuestionsError) throw generatedQuestionsError
    
    // ⭐ 디버깅 로그
    console.log('[API /status] 📝 Generated questions from DB:', {
      count: generatedQuestions?.length || 0,
      samples: generatedQuestions?.slice(0, 3),
      uniquePassages: new Set(generatedQuestions?.map(q => q.passage_id) || []).size,
      uniqueTypes: new Set(generatedQuestions?.map(q => q.question_type_id) || []).size,
    })

    // 4. 통계 계산
    let totalGroups = 0
    let totalTextbooks = 0
    let totalUnits = 0
    let totalPassages = 0
    let sentenceSplitCompleted = 0
    let sentenceSplitPending = 0
    let sentenceSplitError = 0

    // 생성된 데이터를 passage_id 기준으로 그룹화
    const generatedDataByPassage: Record<string, Record<string, string>> = {}
    generatedData?.forEach(item => {
      if (!generatedDataByPassage[item.passage_id]) {
        generatedDataByPassage[item.passage_id] = {}
      }
      generatedDataByPassage[item.passage_id][item.data_type_id] = item.status
    })

    // 생성된 문제를 passage_id 기준으로 그룹화
    const generatedQuestionsByPassage: Record<string, Record<string, string>> = {}
    generatedQuestions?.forEach(item => {
      if (!generatedQuestionsByPassage[item.passage_id]) {
        generatedQuestionsByPassage[item.passage_id] = {}
      }
      generatedQuestionsByPassage[item.passage_id][item.question_type_id] = item.status
    })
    
    // ⭐ 디버깅 로그
    console.log('[API /status] 📦 Grouped questions by passage:', {
      totalPassages: Object.keys(generatedQuestionsByPassage).length,
      sample: Object.entries(generatedQuestionsByPassage)[0],
    })

    // 계층 구조 데이터 생성
    const hierarchyData = (groups as GroupRow[] | null)?.map(group => {
      totalGroups++
      
      const textbooksData = group.textbooks
        ?.sort((a: TextbookRow, b: TextbookRow) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((textbook: TextbookRow) => {
          totalTextbooks++
          
          const unitsData = textbook.units
            ?.sort((a: UnitRow, b: UnitRow) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((unit: UnitRow) => {
              totalUnits++
              
              const passagesData = unit.passages
                ?.sort((a: PassageRow, b: PassageRow) => (a.order_index ?? 0) - (b.order_index ?? 0))
                .map((passage: PassageRow) => {
                  totalPassages++
                  
                  // 문장 분리 상태 카운트
                  if (passage.sentence_split_status === 'completed') {
                    sentenceSplitCompleted++
                  } else if (passage.sentence_split_status === 'error') {
                    sentenceSplitError++
                  } else {
                    sentenceSplitPending++
                  }
                  
                  return {
                    id: passage.id,
                    name: passage.name,
                    orderIndex: passage.order_index,
                    sentenceSplitStatus: passage.sentence_split_status || 'pending',
                    sentenceCount: passage.sentence_count || 0,
                    generatedData: generatedDataByPassage[passage.id] || {},
                    generatedQuestions: generatedQuestionsByPassage[passage.id] || {},
                  }
                }) || []
              
              return {
                id: unit.id,
                name: unit.name,
                orderIndex: unit.order_index,
                passageCount: passagesData.length,
                passages: passagesData,
              }
            }) || []
          
          return {
            id: textbook.id,
            name: textbook.name,
            orderIndex: textbook.order_index,
            unitCount: unitsData.length,
            passageCount: unitsData.reduce((sum: number, u: OutputUnit) => sum + u.passageCount, 0),
            units: unitsData,
          }
        }) || []
      
      return {
        id: group.id,
        name: group.name,
        orderIndex: group.order_index,
        textbookCount: textbooksData.length,
        passageCount: textbooksData.reduce((sum: number, t: OutputTextbook) => sum + t.passageCount, 0),
        textbooks: textbooksData,
      }
    }) || []

    // 데이터 유형별 생성 현황
    const dataTypeStats: Record<string, { total: number; completed: number; failed: number }> = {}
    dataTypes?.forEach(dt => {
      dataTypeStats[dt.id] = { total: 0, completed: 0, failed: 0 }
    })
    
    generatedData?.forEach(item => {
      if (dataTypeStats[item.data_type_id]) {
        dataTypeStats[item.data_type_id].total++
        if (item.status === 'completed') {
          dataTypeStats[item.data_type_id].completed++
        } else if (item.status === 'failed') {
          dataTypeStats[item.data_type_id].failed++
        }
      }
    })

    // 문제 유형별 생성 현황
    const questionTypeStats: Record<string, { total: number; completed: number; failed: number }> = {}
    questionTypes?.forEach(qt => {
      questionTypeStats[qt.id] = { total: 0, completed: 0, failed: 0 }
    })
    
    generatedQuestions?.forEach(item => {
      if (questionTypeStats[item.question_type_id]) {
        questionTypeStats[item.question_type_id].total++
        if (item.status === 'completed') {
          questionTypeStats[item.question_type_id].completed++
        } else if (item.status === 'failed') {
          questionTypeStats[item.question_type_id].failed++
        }
      }
    })

    return NextResponse.json({
      summary: {
        groups: totalGroups,
        textbooks: totalTextbooks,
        units: totalUnits,
        passages: totalPassages,
        sentenceSplit: {
          completed: sentenceSplitCompleted,
          pending: sentenceSplitPending,
          error: sentenceSplitError,
        },
      },
      dataTypes: dataTypes?.map(dt => ({
        id: dt.id,
        name: dt.name,
        category: dt.category,
        stats: dataTypeStats[dt.id] || { total: 0, completed: 0, failed: 0 },
      })) || [],
      questionTypes: questionTypes?.map(qt => ({
        id: qt.id,
        name: qt.name,
        stats: questionTypeStats[qt.id] || { total: 0, completed: 0, failed: 0 },
      })) || [],
      hierarchy: hierarchyData,
    })
  } catch (error) {
    console.error('Error fetching status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    )
  }
}

