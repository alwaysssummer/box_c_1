/**
 * 출제 2단계 시스템 - 1단계 검증 API
 * 
 * POST /api/generation/validate
 * - 문제 유형별 필요 슬롯 데이터 검증
 * - 지문별 생성 현황 확인
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  ValidationResult, 
  PassageValidationResult,
  analyzePassageSlots,
  createValidationSummary,
  evaluateValidation,
} from '@/lib/data-validator'
import { SlotName, QuestionGroup, SLOT_GROUPS, REQUIRED_SLOTS } from '@/lib/slot-system'

interface ValidateRequest {
  questionTypeId: string
  passageIds: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateRequest = await request.json()
    const { questionTypeId, passageIds } = body

    if (!questionTypeId) {
      return NextResponse.json(
        { error: '문제 유형 ID가 필요합니다.' },
        { status: 400 }
      )
    }

    if (!passageIds || passageIds.length === 0) {
      return NextResponse.json(
        { error: '검증할 지문을 선택해주세요.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. 문제 유형 정보 조회
    const { data: questionType, error: qtError } = await supabase
      .from('question_types')
      .select('id, name')
      .eq('id', questionTypeId)
      .single()

    if (qtError || !questionType) {
      console.error('Question type query error:', qtError)
      return NextResponse.json(
        { error: '문제 유형을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 문제 유형의 필요 슬롯 결정 (기본값: practical 그룹)
    const questionGroup: QuestionGroup = 'practical'
    const requiredSlots: SlotName[] = SLOT_GROUPS[questionGroup] || []

    // 2. 지문 정보 조회
    const { data: passages, error: passagesError } = await supabase
      .from('passages')
      .select(`
        id,
        name,
        units!inner (
          name,
          textbooks!inner (
            name
          )
        )
      `)
      .in('id', passageIds)

    if (passagesError) {
      console.error('Passages query error:', passagesError)
      return NextResponse.json(
        { error: '지문 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 3. 각 지문의 생성된 데이터 조회 (기본 컬럼만 사용)
    const { data: generatedData, error: gdError } = await supabase
      .from('generated_data')
      .select(`
        id,
        passage_id,
        data_type_id,
        result,
        status,
        created_at,
        data_types (
          id,
          name
        )
      `)
      .in('passage_id', passageIds)
      .eq('status', 'completed')

    if (gdError) {
      console.error('Generated data query error:', gdError)
      return NextResponse.json(
        { error: '생성 데이터 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 4. 지문별 슬롯 데이터 집계
    const passageSlotMap = new Map<string, Record<string, unknown>>()
    const passageSlotDetails = new Map<string, Record<string, {
      dataTypeId: string
      dataTypeName: string
      generatedAt: string
    }>>()

    for (const gd of generatedData || []) {
      const passageId = gd.passage_id
      
      // 기존 슬롯 데이터 가져오기
      const existingSlots = passageSlotMap.get(passageId) || {}
      const existingDetails = passageSlotDetails.get(passageId) || {}
      
      // data_type 정보 추출
      const dataTypeRaw = gd.data_types
      const dataType = Array.isArray(dataTypeRaw) 
        ? dataTypeRaw[0] as { id: string; name: string } | undefined
        : dataTypeRaw as { id: string; name: string } | null
      
      // 데이터 유형 이름을 슬롯 키로 사용 (간소화)
      const dataTypeName = dataType?.name || '알 수 없음'
      
      // result가 있으면 데이터 유형 이름으로 저장
      if (gd.result) {
        existingSlots[dataTypeName] = gd.result
        existingDetails[dataTypeName] = {
          dataTypeId: dataType?.id || gd.data_type_id,
          dataTypeName: dataTypeName,
          generatedAt: gd.created_at,
        }
      }
      
      passageSlotMap.set(passageId, existingSlots)
      passageSlotDetails.set(passageId, existingDetails)
    }

    // 5. 각 지문별 검증 결과 생성
    const passageResults: PassageValidationResult[] = []

    for (const passage of passages || []) {
      // Supabase는 단일 관계도 배열로 반환할 수 있음
      const unitsRaw = passage.units
      const unit = Array.isArray(unitsRaw) 
        ? unitsRaw[0] as { name: string; textbooks: { name: string }[] | { name: string } } | undefined
        : unitsRaw as { name: string; textbooks: { name: string }[] | { name: string } } | null
      const textbook = unit?.textbooks
        ? (Array.isArray(unit.textbooks) ? unit.textbooks[0] : unit.textbooks)
        : null
      const slotData = passageSlotMap.get(passage.id) || {}
      const slotDetails = passageSlotDetails.get(passage.id)
      
      const analysis = analyzePassageSlots(slotData, requiredSlots, questionGroup)
      
      passageResults.push({
        passageId: passage.id,
        passageName: passage.name,
        unitName: unit?.name,
        textbookName: textbook?.name,
        status: analysis.status,
        existingSlots: analysis.existingSlots,
        missingSlots: analysis.missingSlots,
        missingRequiredSlots: analysis.missingRequiredSlots,
        missingOptionalSlots: analysis.missingOptionalSlots,
        slotDetails,
      })
    }

    // 6. 전체 요약 생성
    const summary = createValidationSummary(passageResults)
    const { canProceed, message } = evaluateValidation(summary)

    const result: ValidationResult = {
      questionTypeId,
      questionTypeName: questionType.name,
      questionGroup,
      requiredSlots,
      summary,
      passages: passageResults,
      canProceed,
      message,
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: '검증 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

