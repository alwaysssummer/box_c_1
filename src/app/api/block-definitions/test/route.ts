import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBlockContent, detectOutputFields, getDefaultModel } from '@/lib/ai-block-generator'
import type { ModelId } from '@/types'

// POST: 블록 프롬프트 테스트
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      prompt,
      passage_id,  // 지문 ID (선택적)
      passage_content,  // 직접 입력 지문 (선택적)
      model,
      variables = {},
    } = body
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }
    
    // 지문 내용 가져오기
    let passageText = passage_content || ''
    
    if (passage_id && !passage_content) {
      const supabase = await createClient()
      const { data: passage, error } = await supabase
        .from('passages')
        .select('content')
        .eq('id', passage_id)
        .single()
      
      if (error || !passage?.content) {
        return NextResponse.json({ error: 'Passage not found' }, { status: 404 })
      }
      passageText = passage.content
    }
    
    if (!passageText) {
      return NextResponse.json({ error: 'Passage content is required' }, { status: 400 })
    }
    
    // AI 호출
    const result = await generateBlockContent({
      prompt,
      passage: passageText,
      model: (model as ModelId) || getDefaultModel(),
      variables,
    })
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        responseTime: result.responseTime,
        model: result.model,
      }, { status: 500 })
    }
    
    // 출력 필드 감지
    const detectedFields = result.content 
      ? detectOutputFields(result.content)
      : []
    
    return NextResponse.json({
      success: true,
      content: result.content,
      rawContent: result.rawContent,
      detectedFields,
      usage: result.usage,
      responseTime: result.responseTime,
      model: result.model,
    })
    
  } catch (error) {
    console.error('Error in POST /api/block-definitions/test:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}








