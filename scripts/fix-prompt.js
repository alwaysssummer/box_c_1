const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function fixPrompt() {
  const { data: blocks, error } = await supabase
    .from('block_definitions')
    .select('*')
    .eq('label', '주제블록')

  if (error) {
    console.error('Error:', error)
    return
  }

  if (!blocks || blocks.length === 0) {
    console.log('블록을 찾을 수 없습니다.')
    return
  }

  const block = blocks[0]
  console.log(`블록 ID: ${block.id}`)
  console.log(`현재 prompt_version: ${block.prompt_version}`)
  
  // 프롬프트에서 "(여기에 새로운 영어 지문을 입력하세요.)" 부분을 {{ passage }}로 변경
  let newPrompt = block.prompt
  
  // 여러 가능한 패턴 치환
  newPrompt = newPrompt.replace(
    /`\(여기에 새로운 영어 지문을 입력하세요\.\)`/g,
    '```\n{{ passage }}\n```'
  )
  
  // "(새로운 지문)" 부분도 {{ passage }}로 변경
  newPrompt = newPrompt.replace(
    /"passage": "\(새로운 지문\)"/g,
    '"passage": "(지문 내용은 생성 결과에 포함하지 마세요)"'
  )
  
  // 추가로 입력 형식 섹션 끝에 명시적으로 지문 삽입 안내 추가
  if (!newPrompt.includes('{{ passage }}')) {
    // 직접 치환이 안 된 경우, 입력 형식 섹션에 추가
    newPrompt = newPrompt.replace(
      /\*\*# 입력 형식:\*\*[\s\S]*?\*\*# 출력 형식:\*\*/,
      `**# 입력 형식:**

**[분석할 지문]**
\`\`\`
{{ passage }}
\`\`\`

**# 출력 형식:**`
    )
  }
  
  console.log('\n수정된 프롬프트의 {{ passage }} 포함 여부:', newPrompt.includes('{{ passage }}'))
  
  // 프롬프트 업데이트
  const { error: updateError } = await supabase
    .from('block_definitions')
    .update({ 
      prompt: newPrompt,
      prompt_version: block.prompt_version + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', block.id)

  if (updateError) {
    console.error('업데이트 오류:', updateError)
    return
  }

  console.log('\n✅ 프롬프트 업데이트 완료!')
  console.log(`새 prompt_version: ${block.prompt_version + 1}`)
  
  // 확인
  const { data: updated } = await supabase
    .from('block_definitions')
    .select('prompt')
    .eq('id', block.id)
    .single()
    
  if (updated) {
    console.log('\n{{ passage }} 존재 확인:', updated.prompt.includes('{{ passage }}') ? '✅ 성공' : '❌ 실패')
  }
}

fixPrompt()






