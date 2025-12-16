import { NextResponse } from 'next/server'
import { AI_MODELS, type ModelId } from '@/types'

// AI 프로바이더별 SDK import
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null
const google = process.env.GOOGLE_GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY) : null

// POST: 프롬프트 개선 요청
export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const {
      currentPrompt,  // 현재 프롬프트
      instruction,    // 개선 지시사항 (자연어)
      model = 'gemini-2.0-flash',
    } = body
    
    if (!currentPrompt) {
      return NextResponse.json({ error: '현재 프롬프트가 필요합니다' }, { status: 400 })
    }
    
    if (!instruction) {
      return NextResponse.json({ error: '개선 지시사항이 필요합니다' }, { status: 400 })
    }
    
    const modelInfo = AI_MODELS[model as ModelId]
    if (!modelInfo) {
      return NextResponse.json({ error: `Unknown model: ${model}` }, { status: 400 })
    }
    
    // 프롬프트 개선 요청 메시지
    const systemPrompt = `당신은 AI 프롬프트 전문가입니다. 사용자의 지시에 따라 프롬프트를 개선해주세요.

규칙:
1. 프롬프트의 핵심 목적과 구조는 유지하세요
2. 사용자의 지시사항만 정확히 반영하세요
3. 불필요한 변경은 하지 마세요
4. 개선된 프롬프트만 출력하세요 (설명 없이)
5. 마크다운 코드블록 없이 순수 텍스트로 출력하세요`

    const userMessage = `현재 프롬프트:
---
${currentPrompt}
---

개선 지시사항: ${instruction}

위 지시사항에 따라 프롬프트를 개선해주세요. 개선된 프롬프트만 출력하세요.`

    let improvedPrompt = ''
    
    // AI 호출
    switch (modelInfo.provider) {
      case 'anthropic': {
        if (!anthropic) {
          return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
        }
        const response = await anthropic.messages.create({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        })
        improvedPrompt = response.content[0]?.type === 'text' ? response.content[0].text : ''
        break
      }
      
      case 'google': {
        if (!google) {
          return NextResponse.json({ error: 'Google Gemini API key not configured' }, { status: 500 })
        }
        const genModel = google.getGenerativeModel({ 
          model,
          systemInstruction: systemPrompt,
        })
        const response = await genModel.generateContent(userMessage)
        improvedPrompt = response.response.text()
        break
      }
      
      default:
        return NextResponse.json({ error: `Unsupported provider: ${modelInfo.provider}` }, { status: 400 })
    }
    
    // 결과 정리 (앞뒤 공백, 불필요한 코드블록 제거)
    improvedPrompt = improvedPrompt.trim()
    if (improvedPrompt.startsWith('```')) {
      improvedPrompt = improvedPrompt.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
    }
    
    return NextResponse.json({
      success: true,
      improvedPrompt,
      model,
    })
    
  } catch (error) {
    console.error('Error in POST /api/block-definitions/improve:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}





