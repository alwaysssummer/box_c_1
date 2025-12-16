const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkRecentGenerations() {
  console.log('=== 최근 block_instances (출제 결과) ===\n')
  
  // 최근 block_instances 조회
  const { data: instances, error: instanceError } = await supabase
    .from('block_instances')
    .select(`
      id,
      passage_id,
      block_def_id,
      status,
      created_at,
      updated_at,
      model_used,
      content,
      passages:passage_id (
        id,
        content
      ),
      block_definitions:block_def_id (
        id,
        label
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  if (instanceError) {
    console.error('Error fetching block_instances:', instanceError)
    return
  }

  console.log(`총 ${instances.length}개의 최근 출제 결과:\n`)
  
  instances.forEach((inst, idx) => {
    const passageContent = inst.passages?.content?.substring(0, 80) || ''
    const blockLabel = inst.block_definitions?.label || 'Unknown'
    const generatedContent = JSON.stringify(inst.content)?.substring(0, 100) || ''
    console.log(`${idx + 1}. [${inst.status}] ${blockLabel}`)
    console.log(`   지문ID: ${inst.passage_id}`)
    console.log(`   지문 내용(일부): ${passageContent}...`)
    console.log(`   생성 결과(일부): ${generatedContent}...`)
    console.log(`   생성일: ${inst.created_at}`)
    console.log(`   모델: ${inst.model_used}`)
    console.log('')
  })

  // 지문별 출제 횟수 통계
  console.log('\n=== 지문별 출제 횟수 ===\n')
  
  const { data: stats, error: statsError } = await supabase
    .from('block_instances')
    .select(`
      passage_id,
      passages:passage_id (id, content)
    `)

  if (statsError) {
    console.error('Error fetching stats:', statsError)
    return
  }

  const passageCounts = {}
  stats.forEach(item => {
    const label = item.passages?.content?.substring(0, 30) || item.passage_id
    passageCounts[label] = (passageCounts[label] || 0) + 1
  })

  const sorted = Object.entries(passageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  sorted.forEach(([label, count], idx) => {
    console.log(`${idx + 1}. "${label}..." - ${count}회`)
  })
}

checkRecentGenerations()

