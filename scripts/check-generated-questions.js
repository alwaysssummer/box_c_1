const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkGeneratedQuestions() {
  console.log('📊 생성된 문제 현황 확인 중...\n')

  // 1. 주제222 문제 유형 ID 찾기
  const { data: questionTypes, error: qtError } = await supabase
    .from('question_types')
    .select('id, name')
    .ilike('name', '%주제%')

  if (qtError) {
    console.error('❌ 문제 유형 조회 실패:', qtError)
    return
  }

  console.log('🔍 "주제" 관련 문제 유형:')
  questionTypes.forEach(qt => {
    console.log(`  - ${qt.name} (ID: ${qt.id})`)
  })
  console.log('')

  const target = questionTypes.find(qt => qt.name === '주제222')
  if (!target) {
    console.log('⚠️  "주제222" 문제 유형을 찾을 수 없습니다.')
    return
  }

  console.log(`✅ 대상 유형: ${target.name} (ID: ${target.id})\n`)

  // 2. 해당 유형의 생성된 문제 조회
  const { data: questions, error: qError } = await supabase
    .from('generated_questions')
    .select(`
      id,
      passage_id,
      question_type_id,
      status,
      created_at,
      passages (
        id,
        name
      )
    `)
    .eq('question_type_id', target.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (qError) {
    console.error('❌ 생성된 문제 조회 실패:', qError)
    return
  }

  console.log(`📝 최근 생성된 "${target.name}" 문제 (최대 10개):\n`)
  
  if (questions.length === 0) {
    console.log('⚠️  생성된 문제가 없습니다.')
  } else {
    questions.forEach((q, idx) => {
      console.log(`${idx + 1}. 지문: ${q.passages?.name || '알 수 없음'}`)
      console.log(`   - ID: ${q.id}`)
      console.log(`   - 상태: ${q.status || 'null ⚠️'}`)
      console.log(`   - 생성일: ${new Date(q.created_at).toLocaleString('ko-KR')}`)
      console.log('')
    })

    // 상태별 통계
    const stats = {
      completed: questions.filter(q => q.status === 'completed').length,
      pending: questions.filter(q => q.status === 'pending').length,
      failed: questions.filter(q => q.status === 'failed').length,
      null: questions.filter(q => !q.status).length,
    }

    console.log('📊 상태별 통계:')
    console.log(`  ✅ 완료: ${stats.completed}개`)
    console.log(`  ⏳ 대기: ${stats.pending}개`)
    console.log(`  ❌ 실패: ${stats.failed}개`)
    console.log(`  ⚠️  null: ${stats.null}개`)
  }
}

checkGeneratedQuestions()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('오류 발생:', err)
    process.exit(1)
  })

