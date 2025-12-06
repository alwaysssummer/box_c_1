import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ============================================
// 요청/응답 타입
// ============================================

interface GenerateQuestionRequest {
  passageId: string
  questionTypeId: string
  skipSave?: boolean  // true면 DB 저장 없이 결과만 반환 (미리보기 모드)
}

interface GenerateQuestionResponse {
  success: boolean
  data?: {
    id: string
    passageId: string
    questionTypeId: string
    instruction: string | null
    body: string | null
    choices: unknown
    answer: string | null
    explanation: string | null
    status: string
  }
  error?: string
}

// ============================================
// POST /api/generate-questions - 문제 생성
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body: GenerateQuestionRequest = await request.json()
    
    const { passageId, questionTypeId, skipSave } = body

    // 유효성 검사
    if (!passageId || !questionTypeId) {
      return NextResponse.json<GenerateQuestionResponse>(
        { success: false, error: '지문 ID와 문제 유형 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 1. 지문 조회
    const { data: passage, error: passageError } = await supabase
      .from('passages')
      .select('id, name, content, korean_translation')
      .eq('id', passageId)
      .single()

    if (passageError || !passage) {
      return NextResponse.json<GenerateQuestionResponse>(
        { success: false, error: '지문을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 2. 문제 유형 및 연결된 데이터 유형 조회
    const { data: questionType, error: questionTypeError } = await supabase
      .from('question_types')
      .select(`
        id,
        name,
        instruction,
        question_type_items (
          id,
          data_type_id,
          role,
          order_index,
          data_type:data_types (
            id,
            name,
            target
          )
        )
      `)
      .eq('id', questionTypeId)
      .single()

    if (questionTypeError || !questionType) {
      return NextResponse.json<GenerateQuestionResponse>(
        { success: false, error: '문제 유형을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 3. 연결된 데이터 유형들의 생성된 데이터 조회
    const items = (questionType.question_type_items as any[]) || []
    const dataTypeIds = items.map(item => item.data_type_id).filter(Boolean)
    
    // 연결된 데이터 유형이 없으면 문제 생성 불가 (데이터 의존성 필수)
    if (dataTypeIds.length === 0) {
      return NextResponse.json<GenerateQuestionResponse>(
        { 
          success: false, 
          error: `문제 유형 "${questionType.name}"에 연결된 데이터 유형이 없습니다. 설정에서 데이터 유형을 먼저 연결해주세요.`
        },
        { status: 400 }
      )
    }

    let generatedDataMap: Record<string, any> = {}
    let missingDataTypes: string[] = []
    
    if (dataTypeIds.length > 0) {
      const { data: generatedDataList } = await supabase
        .from('generated_data')
        .select('data_type_id, result, status')
        .eq('passage_id', passageId)
        .in('data_type_id', dataTypeIds)
        .eq('status', 'completed')

      generatedDataList?.forEach(item => {
        generatedDataMap[item.data_type_id] = item.result
      })
      
      // 누락된 데이터 유형 확인
      for (const item of items) {
        if (item.data_type_id && !generatedDataMap[item.data_type_id]) {
          const dataTypeName = (item.data_type as any)?.name || item.data_type_id
          missingDataTypes.push(dataTypeName)
        }
      }
      
      // 누락된 데이터가 있으면 에러 반환
      if (missingDataTypes.length > 0) {
        return NextResponse.json<GenerateQuestionResponse>(
          { 
            success: false, 
            error: `필요한 데이터가 생성되지 않았습니다: ${missingDataTypes.join(', ')}. 먼저 데이터 생성을 완료해주세요.`
          },
          { status: 400 }
        )
      }
    }

    // 4. 문제 구성
    // role별로 데이터 조합
    const sortedItems = items.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))

    let body_parts: string[] = []
    let choices_data: unknown = null
    let answer_data: string | null = null
    let explanation_data: string | null = null

    for (const item of sortedItems) {
      const data = generatedDataMap[item.data_type_id]
      if (!data) continue

      switch (item.role) {
        case 'body':
          if (typeof data === 'string') {
            body_parts.push(data)
          } else if (data.text) {
            body_parts.push(data.text)
          } else if (data.content) {
            body_parts.push(data.content)
          } else {
            body_parts.push(JSON.stringify(data))
          }
          break
        case 'choices':
          choices_data = data
          break
        case 'answer':
          answer_data = typeof data === 'string' ? data : JSON.stringify(data)
          break
        case 'explanation':
          explanation_data = typeof data === 'string' ? data : JSON.stringify(data)
          break
      }
    }

    const questionBody = body_parts.length > 0 ? body_parts.join('\n\n') : passage.content
    const questionInstruction = questionType.instruction || null

    // 5. skipSave가 true면 DB 저장 없이 결과만 반환 (미리보기 모드)
    if (skipSave) {
      return NextResponse.json<GenerateQuestionResponse>({
        success: true,
        data: {
          id: '', // 아직 저장 안 됨
          passageId,
          questionTypeId,
          instruction: questionInstruction,
          body: questionBody,
          choices: choices_data,
          answer: answer_data,
          explanation: explanation_data,
          status: 'preview', // 미리보기 상태
        },
      })
    }

    // 6. 기존 데이터 확인
    const { data: existingQuestion } = await supabase
      .from('generated_questions')
      .select('id')
      .eq('passage_id', passageId)
      .eq('question_type_id', questionTypeId)
      .single()

    // 7. DB에 저장
    const questionData = {
      passage_id: passageId,
      question_type_id: questionTypeId,
      instruction: questionInstruction,
      body: questionBody,
      choices: choices_data,
      answer: answer_data,
      explanation: explanation_data,
      status: 'completed',
      error_message: null,
    }

    let savedQuestion: { id: string } | null = null
    let saveError: Error | null = null

    if (existingQuestion?.id) {
      // UPDATE
      const { data, error } = await supabase
        .from('generated_questions')
        .update(questionData)
        .eq('id', existingQuestion.id)
        .select('id')
        .single()
      savedQuestion = data
      saveError = error
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('generated_questions')
        .insert(questionData)
        .select('id')
        .single()
      savedQuestion = data
      saveError = error
    }

    if (saveError) {
      console.error('Error saving generated question:', saveError)
      return NextResponse.json<GenerateQuestionResponse>(
        { success: false, error: '문제 저장에 실패했습니다: ' + saveError.message },
        { status: 500 }
      )
    }

    return NextResponse.json<GenerateQuestionResponse>({
      success: true,
      data: {
        id: savedQuestion?.id || '',
        passageId,
        questionTypeId,
        instruction: questionInstruction,
        body: questionBody,
        choices: choices_data,
        answer: answer_data,
        explanation: explanation_data,
        status: 'completed',
      },
    })

  } catch (error) {
    console.error('Question generation error:', error)
    return NextResponse.json<GenerateQuestionResponse>(
      { success: false, error: error instanceof Error ? error.message : '문제 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/generate-questions - 생성된 문제 조회 또는 의존성 확인
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const passageId = searchParams.get('passageId')
    const questionTypeId = searchParams.get('questionTypeId')
    const status = searchParams.get('status')
    const checkDependencies = searchParams.get('checkDependencies')
    
    // 의존성 확인 모드
    if (checkDependencies === 'true' && questionTypeId) {
      // 문제 유형의 연결된 데이터 유형 조회
      const { data: questionType, error: qtError } = await supabase
        .from('question_types')
        .select(`
          id,
          name,
          question_type_items (
            data_type_id,
            data_type:data_types (
              id,
              name
            )
          )
        `)
        .eq('id', questionTypeId)
        .single()
      
      if (qtError || !questionType) {
        return NextResponse.json({ error: '문제 유형을 찾을 수 없습니다' }, { status: 404 })
      }
      
      const requiredDataTypes = (questionType.question_type_items as any[])
        ?.map(item => ({
          id: item.data_type_id,
          name: (item.data_type as any)?.name || item.data_type_id
        }))
        .filter(dt => dt.id) || []
      
      // 의존성이 없으면 바로 준비 완료
      if (requiredDataTypes.length === 0) {
        return NextResponse.json({
          questionTypeId,
          questionTypeName: questionType.name,
          requiredDataTypes: [],
          hasNoDependencies: true,
        })
      }
      
      // 지문 ID들이 있으면 각 지문별 준비 상태 확인
      const passageIds = searchParams.get('passageIds')?.split(',').filter(Boolean) || []
      
      if (passageIds.length > 0) {
        // 해당 지문들의 생성된 데이터 조회
        const { data: generatedData } = await supabase
          .from('generated_data')
          .select('passage_id, data_type_id, status')
          .in('passage_id', passageIds)
          .in('data_type_id', requiredDataTypes.map(dt => dt.id))
          .eq('status', 'completed')
        
        // 지문별 준비 상태 계산
        const passageReadiness: Record<string, { ready: boolean; missing: string[] }> = {}
        
        for (const pid of passageIds) {
          const completedDataTypes = generatedData
            ?.filter(d => d.passage_id === pid)
            .map(d => d.data_type_id) || []
          
          const missing = requiredDataTypes
            .filter(dt => !completedDataTypes.includes(dt.id))
            .map(dt => dt.name)
          
          passageReadiness[pid] = {
            ready: missing.length === 0,
            missing,
          }
        }
        
        return NextResponse.json({
          questionTypeId,
          questionTypeName: questionType.name,
          requiredDataTypes,
          passageReadiness,
        })
      }
      
      return NextResponse.json({
        questionTypeId,
        questionTypeName: questionType.name,
        requiredDataTypes,
      })
    }
    
    // 일반 조회 모드
    let query = supabase
      .from('generated_questions')
      .select(`
        *,
        passage:passages!generated_questions_passage_id_fkey (
          id, name, content
        ),
        question_type:question_types!generated_questions_question_type_id_fkey (
          id, name, instruction
        )
      `)
      .order('created_at', { ascending: false })
    
    if (passageId) {
      query = query.eq('passage_id', passageId)
    }
    if (questionTypeId) {
      query = query.eq('question_type_id', questionTypeId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching generated questions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/generate-questions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT /api/generate-questions - 미리보기 결과 일괄 저장
// ============================================

interface SaveQuestionItem {
  passageId: string
  questionTypeId: string
  instruction: string | null
  body: string | null
  choices: unknown
  answer: string | null
  explanation: string | null
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const reqBody: { items: SaveQuestionItem[] } = await request.json()
    
    if (!reqBody.items || !Array.isArray(reqBody.items) || reqBody.items.length === 0) {
      return NextResponse.json(
        { success: false, error: '저장할 데이터가 없습니다' },
        { status: 400 }
      )
    }
    
    const results: { passageId: string; success: boolean; error?: string }[] = []
    
    for (const item of reqBody.items) {
      try {
        // 기존 데이터 확인
        const { data: existingQuestion } = await supabase
          .from('generated_questions')
          .select('id')
          .eq('passage_id', item.passageId)
          .eq('question_type_id', item.questionTypeId)
          .single()
        
        const questionData = {
          passage_id: item.passageId,
          question_type_id: item.questionTypeId,
          instruction: item.instruction,
          body: item.body,
          choices: item.choices,
          answer: item.answer,
          explanation: item.explanation,
          status: 'completed',
          error_message: null,
        }
        
        if (existingQuestion?.id) {
          // UPDATE
          const { error } = await supabase
            .from('generated_questions')
            .update(questionData)
            .eq('id', existingQuestion.id)
          
          if (error) throw error
        } else {
          // INSERT
          const { error } = await supabase
            .from('generated_questions')
            .insert(questionData)
          
          if (error) throw error
        }
        
        results.push({ passageId: item.passageId, success: true })
      } catch (err) {
        results.push({ 
          passageId: item.passageId, 
          success: false, 
          error: err instanceof Error ? err.message : '저장 실패' 
        })
      }
    }
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    return NextResponse.json({
      success: failCount === 0,
      message: `저장 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
      results,
    })
    
  } catch (error) {
    console.error('Error saving generated questions batch:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save generated questions' },
      { status: 500 }
    )
  }
}
