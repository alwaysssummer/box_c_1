/**
 * 문제 유형에 프롬프트 연결 스크립트
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔧 문제 유형 - 프롬프트 연결 수정 중...\n')

  // 1. 프롬프트 목록 조회
  const { data: prompts, error: promptError } = await supabase
    .from('prompts')
    .select('id, name, question_group')
  
  if (promptError) {
    console.error('프롬프트 조회 실패:', promptError)
    return
  }

  console.log('📚 프롬프트 목록:')
  prompts?.forEach(p => console.log(`  - ${p.name} (${p.id})`))
  console.log('')

  // 2. 문제 유형 목록 조회
  const { data: questionTypes, error: qtError } = await supabase
    .from('question_types')
    .select('id, name, prompt_id')
  
  if (qtError) {
    console.error('문제 유형 조회 실패:', qtError)
    return
  }

  console.log('📝 문제 유형 목록:')
  questionTypes?.forEach(qt => console.log(`  - ${qt.name} (prompt_id: ${qt.prompt_id || 'null'})`))
  console.log('')

  // 3. 이름이 같은 것끼리 연결
  const toUpdate: { qtId: string; qtName: string; promptId: string; promptName: string }[] = []
  
  for (const qt of questionTypes || []) {
    if (qt.prompt_id) continue // 이미 연결됨
    
    // 같은 이름의 프롬프트 찾기
    const matchingPrompt = prompts?.find(p => p.name === qt.name)
    if (matchingPrompt) {
      toUpdate.push({
        qtId: qt.id,
        qtName: qt.name,
        promptId: matchingPrompt.id,
        promptName: matchingPrompt.name,
      })
    }
  }

  if (toUpdate.length === 0) {
    console.log('✅ 연결할 항목이 없습니다.')
    return
  }

  console.log('🔗 연결할 항목:')
  toUpdate.forEach(item => {
    console.log(`  - "${item.qtName}" → "${item.promptName}"`)
  })
  console.log('')

  // 4. 업데이트 실행 (prompt_id만 - question_group 컬럼이 없을 수 있음)
  for (const item of toUpdate) {
    const { error: updateError } = await supabase
      .from('question_types')
      .update({ 
        prompt_id: item.promptId,
      })
      .eq('id', item.qtId)
    
    if (updateError) {
      console.error(`❌ 실패: ${item.qtName}`, updateError.message)
    } else {
      console.log(`✅ 연결 완료: ${item.qtName}`)
    }
  }

  console.log('\n🎉 완료!')
}

main().catch(console.error)

