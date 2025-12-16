const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testFullFilter() {
  console.log('🔍 전체 필터링 흐름 테스트\n')

  // 1. 주제222 ID
  const { data: qt } = await supabase
    .from('question_types')
    .select('id, name')
    .eq('name', '주제222')
    .single()

  console.log(`✅ 주제222 ID: ${qt.id}\n`)

  // 2. 전체 그룹/교재/단원/지문 구조 가져오기
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

  // 3. 생성된 문제 가져오기
  const { data: generatedQuestions } = await supabase
    .from('generated_questions')
    .select('passage_id, question_type_id, status')

  // 4. passage별 맵 생성
  const generatedQuestionsByPassage = {}
  generatedQuestions?.forEach(item => {
    if (!generatedQuestionsByPassage[item.passage_id]) {
      generatedQuestionsByPassage[item.passage_id] = {}
    }
    generatedQuestionsByPassage[item.passage_id][item.question_type_id] = item.status
  })

  // 5. 각 그룹별로 체크
  console.log('📊 그룹별 지문 현황:\n')
  
  groups?.forEach(group => {
    console.log(`📁 ${group.name}`)
    group.textbooks?.forEach(textbook => {
      console.log(`  📚 ${textbook.name}`)
      let totalPassages = 0
      let visiblePassages = 0
      
      textbook.units?.forEach(unit => {
        totalPassages += unit.passages?.length || 0
        
        unit.passages?.forEach(passage => {
          // isPassageVisible 로직 복제
          const filterType = 'questionType'
          const selectedTypeId = qt.id
          const statusFilter = 'all'
          
          let isVisible = false
          if (filterType === 'questionType' && selectedTypeId !== 'all') {
            if (statusFilter === 'all') {
              isVisible = true
            }
          }
          
          if (isVisible) visiblePassages++
        })
      })
      
      console.log(`    전체: ${totalPassages}개 → 표시: ${visiblePassages}개`)
    })
    console.log('')
  })

  // 6. selectedTextbookIds 시뮬레이션
  console.log('🎯 교재 선택 시뮬레이션:\n')
  
  const firstTextbookId = groups?.[0]?.textbooks?.[0]?.id
  if (firstTextbookId) {
    console.log(`선택된 교재 ID: ${firstTextbookId}`)
    
    // selectedTextbooks 생성
    const selectedTextbooks = []
    groups?.forEach(group => {
      group.textbooks?.forEach(textbook => {
        if (textbook.id === firstTextbookId) {
          selectedTextbooks.push({ textbook, groupName: group.name })
        }
      })
    })
    
    console.log(`선택된 교재 수: ${selectedTextbooks.length}`)
    
    if (selectedTextbooks.length > 0) {
      const { textbook } = selectedTextbooks[0]
      let totalPassages = 0
      let visiblePassages = 0
      
      textbook.units?.forEach(unit => {
        totalPassages += unit.passages?.length || 0
        
        unit.passages?.forEach(passage => {
          const filterType = 'questionType'
          const selectedTypeId = qt.id
          const statusFilter = 'all'
          
          if (filterType === 'questionType' && selectedTypeId !== 'all') {
            if (statusFilter === 'all') {
              visiblePassages++
            }
          }
        })
      })
      
      console.log(`\n결과:`)
      console.log(`  전체 지문: ${totalPassages}개`)
      console.log(`  표시될 지문: ${visiblePassages}개`)
      console.log(`  교재명: ${textbook.name}`)
    }
  }
}

testFullFilter()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('오류:', err)
    process.exit(1)
  })

