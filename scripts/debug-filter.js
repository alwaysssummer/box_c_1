const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugFilter() {
  console.log('🔍 필터링 문제 디버깅 시작...\n')

  // 1. 주제222 ID 확인
  const { data: qt } = await supabase
    .from('question_types')
    .select('id, name')
    .eq('name', '주제222')
    .single()

  if (!qt) {
    console.log('❌ 주제222 유형을 찾을 수 없습니다.')
    return
  }

  console.log(`✅ 주제222 ID: ${qt.id}\n`)

  // 2. /api/status 응답 시뮬레이션
  console.log('📊 /api/status 응답 구조 확인...\n')

  const { data: groups } = await supabase
    .from('groups')
    .select(`
      id,
      name,
      textbooks (
        id,
        name,
        units (
          id,
          name,
          passages (
            id,
            name
          )
        )
      )
    `)
    .limit(1)

  const { data: generatedQuestions } = await supabase
    .from('generated_questions')
    .select('passage_id, question_type_id, status')

  console.log('생성된 문제 총 개수:', generatedQuestions?.length || 0)
  console.log('주제222 문제 개수:', generatedQuestions?.filter(q => q.question_type_id === qt.id).length || 0)
  console.log('')

  // 3. passage별 generatedQuestions 맵 생성 (API와 동일한 로직)
  const generatedQuestionsByPassage = {}
  generatedQuestions?.forEach(item => {
    if (!generatedQuestionsByPassage[item.passage_id]) {
      generatedQuestionsByPassage[item.passage_id] = {}
    }
    generatedQuestionsByPassage[item.passage_id][item.question_type_id] = item.status
  })

  // 4. 첫 번째 그룹의 첫 번째 지문 확인
  if (groups && groups[0]?.textbooks?.[0]?.units?.[0]?.passages?.[0]) {
    const passage = groups[0].textbooks[0].units[0].passages[0]
    console.log('📝 샘플 지문 데이터:')
    console.log(`  이름: ${passage.name}`)
    console.log(`  ID: ${passage.id}`)
    console.log(`  generatedQuestions:`, generatedQuestionsByPassage[passage.id] || {})
    console.log(`  주제222 상태:`, generatedQuestionsByPassage[passage.id]?.[qt.id] || 'undefined')
    console.log('')
  }

  // 5. 필터링 로직 시뮬레이션
  console.log('🎯 필터링 로직 테스트:\n')

  const filterType = 'questionType'
  const selectedTypeId = qt.id
  const statusFilter = 'all'

  console.log('필터 설정:')
  console.log(`  filterType: ${filterType}`)
  console.log(`  selectedTypeId: ${selectedTypeId}`)
  console.log(`  statusFilter: ${statusFilter}`)
  console.log('')

  // 6. 실제 필터링 적용
  if (groups && groups[0]?.textbooks?.[0]?.units?.[0]?.passages) {
    const passages = groups[0].textbooks[0].units[0].passages
    console.log(`전체 지문 수: ${passages.length}`)

    let visibleCount = 0
    passages.forEach(passage => {
      const generatedQs = generatedQuestionsByPassage[passage.id] || {}
      const status = generatedQs[selectedTypeId]

      let isVisible = false
      if (filterType === 'questionType' && selectedTypeId !== 'all') {
        if (statusFilter === 'all') {
          isVisible = true  // 모든 지문 표시
        }
      }

      if (isVisible) visibleCount++
    })

    console.log(`필터링 후 표시될 지문 수: ${visibleCount}`)
    console.log('')

    // 7. 상태별 분류
    const withCompleted = passages.filter(p => {
      const gq = generatedQuestionsByPassage[p.id] || {}
      return gq[selectedTypeId] === 'completed'
    })

    const withPending = passages.filter(p => {
      const gq = generatedQuestionsByPassage[p.id] || {}
      return !gq[selectedTypeId] || gq[selectedTypeId] === 'pending'
    })

    const withFailed = passages.filter(p => {
      const gq = generatedQuestionsByPassage[p.id] || {}
      return gq[selectedTypeId] === 'failed' || gq[selectedTypeId] === 'error'
    })

    console.log('상태별 지문 수:')
    console.log(`  ✅ 완료: ${withCompleted.length}개`)
    console.log(`  ⏳ 생성 가능: ${withPending.length}개`)
    console.log(`  ❌ 오류: ${withFailed.length}개`)
  }
}

debugFilter()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('오류 발생:', err)
    process.exit(1)
  })

