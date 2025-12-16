const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkPrompt() {
  const { data: blocks, error } = await supabase
    .from('block_definitions')
    .select('*')

  if (error) {
    console.error('Error:', error)
    return
  }

  blocks.forEach((block, idx) => {
    console.log(`\n=== 블록 ${idx + 1}: ${block.label} ===\n`)
    console.log('프롬프트 전체 내용:')
    console.log('-----------------------------------')
    console.log(block.prompt)
    console.log('-----------------------------------')
    
    // {{ passage }} 플레이스홀더 확인
    const hasPassagePlaceholder = /\{\{\s*passage\s*\}\}/i.test(block.prompt)
    console.log(`\n{{ passage }} 플레이스홀더 존재 여부: ${hasPassagePlaceholder ? '✅ 있음' : '❌ 없음!'}`)
    
    if (!hasPassagePlaceholder) {
      console.log('⚠️ 경고: 프롬프트에 {{ passage }}가 없어서 지문이 AI에 전달되지 않습니다!')
    }
  })
}

checkPrompt()






