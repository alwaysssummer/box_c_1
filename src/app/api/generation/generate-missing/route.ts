/**
 * 출제 2단계 시스템 - 누락 데이터 생성 API
 * 
 * POST /api/generation/generate-missing
 * - 검증 결과에서 누락된 슬롯 데이터 생성
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SlotName } from '@/lib/slot-system'
import { parsePromptResult } from '@/lib/prompt-parser'

interface GenerateMissingRequest {
  passageIds: string[]
  targetSlots: SlotName[]
  dataTypeId?: string  // 특정 데이터 유형으로 생성 (선택)
}

interface GenerationResult {
  passageId: string
  passageName: string
  status: 'success' | 'failed' | 'skipped'
  generatedSlots: string[]
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateMissingRequest = await request.json()
    const { passageIds, targetSlots, dataTypeId } = body

    if (!passageIds || passageIds.length === 0) {
      return NextResponse.json(
        { error: '생성할 지문을 선택해주세요.' },
        { status: 400 }
      )
    }

    if (!targetSlots || targetSlots.length === 0) {
      return NextResponse.json(
        { error: '생성할 슬롯을 지정해주세요.' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const results: GenerationResult[] = []
    let successCount = 0
    let failedCount = 0

    // 1. 타겟 슬롯을 생성할 수 있는 데이터 유형 찾기
    let dataTypesToUse: { id: string; name: string; prompt: string; output_slots: string[] }[] = []

    if (dataTypeId) {
      // 특정 데이터 유형 사용
      const { data: dt, error: dtError } = await supabase
        .from('data_types')
        .select('id, name, prompt, output_slots')
        .eq('id', dataTypeId)
        .single()

      if (dtError || !dt) {
        return NextResponse.json(
          { error: '데이터 유형을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      dataTypesToUse = [dt as any]
    } else {
      // 타겟 슬롯을 생성할 수 있는 데이터 유형 자동 찾기
      const { data: dataTypes, error: dtError } = await supabase
        .from('data_types')
        .select('id, name, prompt, output_slots')
        .not('output_slots', 'is', null)

      if (dtError) {
        return NextResponse.json(
          { error: '데이터 유형 조회 실패' },
          { status: 500 }
        )
      }

      // 타겟 슬롯을 포함하는 데이터 유형 필터링
      dataTypesToUse = (dataTypes || []).filter(dt => {
        const outputSlots = dt.output_slots || []
        return targetSlots.some(slot => outputSlots.includes(slot))
      }) as any[]
    }

    if (dataTypesToUse.length === 0) {
      return NextResponse.json(
        { error: '해당 슬롯을 생성할 수 있는 데이터 유형이 없습니다. 데이터 유형의 output_slots를 설정해주세요.' },
        { status: 400 }
      )
    }

    // 2. 각 지문에 대해 데이터 생성
    for (const passageId of passageIds) {
      // 지문 정보 조회
      const { data: passage, error: passageError } = await supabase
        .from('passages')
        .select('id, name, content')
        .eq('id', passageId)
        .single()

      if (passageError || !passage) {
        results.push({
          passageId,
          passageName: '알 수 없음',
          status: 'failed',
          generatedSlots: [],
          error: '지문을 찾을 수 없습니다.',
        })
        failedCount++
        continue
      }

      // 이미 생성된 슬롯 확인
      const { data: existingData } = await supabase
        .from('generated_data')
        .select('slot_data')
        .eq('passage_id', passageId)
        .eq('status', 'completed')

      const existingSlots = new Set<string>()
      for (const gd of existingData || []) {
        if (gd.slot_data && typeof gd.slot_data === 'object') {
          Object.keys(gd.slot_data).forEach(key => existingSlots.add(key))
        }
      }

      // 실제로 누락된 슬롯만 필터링
      const missingSlots = targetSlots.filter(slot => !existingSlots.has(slot))

      if (missingSlots.length === 0) {
        results.push({
          passageId,
          passageName: passage.name,
          status: 'skipped',
          generatedSlots: [],
          error: '모든 슬롯이 이미 생성되어 있습니다.',
        })
        continue
      }

      // 각 데이터 유형으로 생성 시도
      const generatedSlots: string[] = []

      for (const dataType of dataTypesToUse) {
        // 이 데이터 유형이 생성할 수 있는 누락 슬롯 확인
        const slotsToGenerate = missingSlots.filter(
          slot => (dataType.output_slots || []).includes(slot)
        )

        if (slotsToGenerate.length === 0) continue

        // 프롬프트가 없으면 스킵
        if (!dataType.prompt) continue

        try {
          // 프롬프트 실행 (기존 generate-data API 호출)
          const generateRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-data`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                passageId,
                dataTypeId: dataType.id,
              }),
            }
          )

          if (generateRes.ok) {
            const generateResult = await generateRes.json()
            
            // 결과 파싱 및 slot_data 업데이트
            if (generateResult.result) {
              const resultStr = typeof generateResult.result === 'string' 
                ? generateResult.result 
                : JSON.stringify(generateResult.result)
              
              const parsed = parsePromptResult(resultStr)
              
              if (parsed.success && Object.keys(parsed.data).length > 0) {
                // generated_data에 slot_data 업데이트
                await supabase
                  .from('generated_data')
                  .update({ slot_data: parsed.data })
                  .eq('passage_id', passageId)
                  .eq('data_type_id', dataType.id)
                  .eq('status', 'completed')

                generatedSlots.push(...Object.keys(parsed.data))
              }
            }
          }
        } catch (error) {
          console.error(`데이터 생성 실패 (${passage.name}, ${dataType.name}):`, error)
        }
      }

      if (generatedSlots.length > 0) {
        results.push({
          passageId,
          passageName: passage.name,
          status: 'success',
          generatedSlots: [...new Set(generatedSlots)],
        })
        successCount++
      } else {
        results.push({
          passageId,
          passageName: passage.name,
          status: 'failed',
          generatedSlots: [],
          error: '데이터 생성에 실패했습니다.',
        })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: passageIds.length,
        success: successCount,
        failed: failedCount,
        skipped: passageIds.length - successCount - failedCount,
      },
      results,
    })

  } catch (error) {
    console.error('Generate missing error:', error)
    return NextResponse.json(
      { error: '데이터 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}



