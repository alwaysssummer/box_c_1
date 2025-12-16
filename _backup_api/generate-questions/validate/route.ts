import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/generate-questions/validate - 원큐 생성 전 검증
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { questionTypeId, passageIds, textbookIds } = body
    
    // passageIds 또는 textbookIds 중 하나는 필요
    if (!questionTypeId || (!passageIds?.length && !textbookIds?.length)) {
      return NextResponse.json(
        { error: 'questionTypeId and (passageIds or textbookIds) are required' },
        { status: 400 }
      )
    }
    
    // 1. 문제 유형의 필요 데이터 유형 조회
    const { data: questionType, error: qtError } = await supabase
      .from('question_types')
      .select(`
        id,
        name,
        question_type_items (
          data_type_id,
          role,
          data_type:data_types (
            id,
            name
          )
        )
      `)
      .eq('id', questionTypeId)
      .single()
    
    if (qtError || !questionType) {
      return NextResponse.json(
        { error: 'Question type not found' },
        { status: 404 }
      )
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requiredDataTypeIds = (questionType.question_type_items as any[])?.map(
      (item: { data_type_id: string }) => item.data_type_id
    ) || []
    
    // 2. 지문 조회 (passageIds 직접 또는 textbookIds로 조회)
    let passages
    let passagesError
    
    if (passageIds && passageIds.length > 0) {
      // passageIds로 직접 조회
      const result = await supabase
        .from('passages')
        .select(`
          id,
          name,
          sentence_split_status,
          units!inner (
            id,
            name,
            textbooks!inner (
              id,
              name
            )
          )
        `)
        .in('id', passageIds)
      
      passages = result.data
      passagesError = result.error
    } else {
      // textbookIds로 조회 (하위 호환)
      const result = await supabase
        .from('passages')
        .select(`
          id,
          name,
          sentence_split_status,
          units!inner (
            id,
            name,
            textbooks!inner (
              id,
              name
            )
          )
        `)
        .in('units.textbooks.id', textbookIds)
      
      passages = result.data
      passagesError = result.error
    }
    
    if (passagesError) {
      console.error('Error fetching passages:', passagesError)
      return NextResponse.json(
        { error: 'Failed to fetch passages' },
        { status: 500 }
      )
    }
    
    if (!passages || passages.length === 0) {
      return NextResponse.json({
        passages: [],
        requiredDataTypes: requiredDataTypeIds,
      })
    }
    
    // 3. 각 지문의 생성된 데이터 조회
    const passageIdList = passages.map(p => p.id)
    const { data: generatedData, error: gdError } = await supabase
      .from('generated_data')
      .select('passage_id, data_type_id, status')
      .in('passage_id', passageIdList)
      .eq('status', 'completed')
    
    if (gdError) {
      console.error('Error fetching generated data:', gdError)
    }
    
    // 4. 지문별 상태 계산
    const passageStatuses = passages.map(passage => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const units = passage.units as any
      const textbook = units?.textbooks
      
      // 해당 지문의 생성된 데이터 ID 목록
      const completedDataTypeIds = (generatedData || [])
        .filter(gd => gd.passage_id === passage.id)
        .map(gd => gd.data_type_id)
      
      // 누락된 데이터 유형 찾기
      const missingDataTypeIds = requiredDataTypeIds.filter(
        (dtId: string) => !completedDataTypeIds.includes(dtId)
      )
      
      // 누락된 데이터 유형 이름
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const missingDataTypes = (questionType.question_type_items as any[])
        ?.filter((item: { data_type_id: string }) => missingDataTypeIds.includes(item.data_type_id))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: { data_type: any }) => item.data_type?.name || 'Unknown') || []
      
      return {
        id: passage.id,
        name: passage.name,
        textbookName: textbook?.name || 'Unknown',
        unitName: units?.name || 'Unknown',
        sentenceSplitStatus: passage.sentence_split_status || 'pending',
        missingDataTypes,
        hasAllData: missingDataTypeIds.length === 0,
      }
    })
    
    return NextResponse.json({
      passages: passageStatuses,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requiredDataTypes: (questionType.question_type_items as any[])?.map((item: any) => ({
        id: item.data_type_id,
        name: item.data_type?.name,
        role: item.role,
      })) || [],
    })
  } catch (error) {
    console.error('Error in validate:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


