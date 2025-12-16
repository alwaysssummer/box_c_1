import { createClient } from '@/lib/supabase/server'

interface RegisterRequest {
  question_type_id: string
  results: Array<{
    passage_id: string
    passage_name: string
    success: boolean
    content?: Record<string, unknown>
  }>
}

// POST: 생성된 문제 등록 (SSE 스트리밍)
export async function POST(request: Request) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // SSE 응답 헤더
  const response = new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })

  // 비동기 등록 처리
  ;(async () => {
    try {
      console.log('[Register] 🚀 Starting registration process')
      const supabase = await createClient()
      const body: RegisterRequest = await request.json()
    
      const { question_type_id, results } = body
      
      console.log('[Register] 📦 Request data:', {
        question_type_id,
        resultsCount: results?.length,
        successCount: results?.filter(r => r.success).length,
      })
      
      if (!question_type_id) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: 'question_type_id is required'
        })}\n\n`))
        await writer.close()
        return
      }
      
      if (!results || !Array.isArray(results) || results.length === 0) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: 'No results to register'
        })}\n\n`))
        await writer.close()
        return
      }
    
      // 메타데이터 전송
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'metadata',
        total: results.filter(r => r.success && r.content).length
      })}\n\n`))

      // 문제 유형 정보 가져오기
      const { data: questionType, error: qtError } = await supabase
        .from('question_types')
        .select('*')
        .eq('id', question_type_id)
        .single()
      
      if (qtError || !questionType) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: 'Question type not found'
        })}\n\n`))
        await writer.close()
        return
      }
      
      // 블록 정의 가져오기 (modifies_passage 플래그 확인용)
      const blockIds = questionType.required_block_ids || []
      let shouldModifyPassage = false
      
      if (blockIds.length > 0) {
        const { data: blockDefs } = await supabase
          .from('block_definitions')
          .select('modifies_passage')
          .in('id', blockIds)
        
        shouldModifyPassage = blockDefs?.some(def => def.modifies_passage === true) || false
      }
      
      // 성공한 결과만 등록
      const successResults = results.filter(r => r.success && r.content)
      
      if (successResults.length === 0) {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: 'No successful results to register'
        })}\n\n`))
        await writer.close()
        return
      }
      
      // 원본 지문 가져오기
      const passageIds = successResults.map(r => r.passage_id)
      const { data: passages } = await supabase
        .from('passages')
        .select('id, content')
        .in('id', passageIds)
      
      const passageMap = new Map(passages?.map(p => [p.id, p.content]) || [])
    
      console.log('[Register] 📝 Starting to register:', {
        totalSuccess: successResults.length,
        passageIds: successResults.map(r => r.passage_id).slice(0, 3),
      })

      // ⭐ 하나씩 등록하면서 진행 상황 전송
      for (let i = 0; i < successResults.length; i++) {
        const result = successResults[i]
        const content = result.content!
        
        console.log(`[Register] Processing ${i + 1}/${successResults.length}: ${result.passage_name}`)
        
        // 진행 상황 전송
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          current: i + 1,
          total: successResults.length,
          passage_id: result.passage_id,
          passage_name: result.passage_name,
        })}\n\n`))
        
        try {
          // 지문 가공 블록이면 AI 출력 사용, 아니면 원본 지문 사용
          let bodyField: string | null
          if (shouldModifyPassage) {
            bodyField = (content.passage || content.body || null) as string | null
          } else {
            bodyField = passageMap.get(result.passage_id) || null
          }
          
          const choices = content.choices || null
          const answer = content.answer || null
          const explanation = content.explanation || null
          
          const questionData = {
            passage_id: result.passage_id,
            question_type_id: question_type_id,
            body: bodyField ? String(bodyField) : null,
            choices: choices ? JSON.stringify(choices) : null,
            answer: answer ? String(answer) : null,
            explanation: explanation,
            block_data: content,
            status: 'completed',  // ⭐ 상태 필드 추가 (문제관리에서 표시되도록)
            created_at: new Date().toISOString(),
          }
          
          // 기존 데이터 삭제 (덮어쓰기)
          await supabase
            .from('generated_questions')
            .delete()
            .eq('question_type_id', question_type_id)
            .eq('passage_id', result.passage_id)
          
          // 새 데이터 삽입
          const { data: inserted, error: insertError } = await supabase
            .from('generated_questions')
            .insert(questionData)
            .select()
          
          // ⭐ 디버깅 로그
          if (!insertError && inserted) {
            console.log('[Register] ✅ Successfully inserted:', {
              passage_id: result.passage_id,
              question_type_id,
              inserted_id: inserted[0]?.id,
              status: inserted[0]?.status,
            })
          } else if (insertError) {
            console.error('[Register] ❌ Insert error:', {
              passage_id: result.passage_id,
              error: insertError,
            })
          }
          
          // 결과 전송
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'result',
            passage_id: result.passage_id,
            passage_name: result.passage_name,
            success: !insertError,
            error: insertError?.message,
          })}\n\n`))
          
        } catch (error) {
          // 개별 오류 전송
          await writer.write(encoder.encode(`data: ${JSON.stringify({
            type: 'result',
            passage_id: result.passage_id,
            passage_name: result.passage_name,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })}\n\n`))
        }
      }
      
      // 완료 전송
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'complete',
        registered: successResults.length,
      })}\n\n`))
      
    } catch (error) {
      console.error('[Register] Error:', error)
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Internal server error'
      })}\n\n`))
    } finally {
      await writer.close()
    }
  })()

  return response
}




