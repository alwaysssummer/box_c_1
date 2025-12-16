/**
 * 문제 유형 순서 변경 스크립트
 * 중심내용 그룹: 중심내용(1) → 주제(2) → 제목(3) 순서로 변경
 */

const API_URL = 'http://localhost:3000/api/question-types'

async function reorderQuestionTypes() {
  try {
    // 1. 모든 문제 유형 조회
    const response = await fetch(API_URL)
    const questionTypes = await response.json()
    
    console.log('📋 현재 문제 유형 목록:')
    questionTypes.forEach(qt => {
      console.log(`  - ${qt.name} (display_order: ${qt.display_order}, group: ${qt.display_group})`)
    })
    
    // 2. 중심내용/주제/제목 문제 유형 찾기
    const jungsim = questionTypes.find(qt => qt.name === '중심내용')
    const juje = questionTypes.find(qt => qt.name === '주제')
    const jemok = questionTypes.find(qt => qt.name === '제목')
    
    console.log('\n🔍 변경 대상:')
    if (jungsim) console.log(`  - 중심내용: ${jungsim.name} (현재 순서: ${jungsim.display_order})`)
    if (juje) console.log(`  - 주제: ${juje.name} (현재 순서: ${juje.display_order})`)
    if (jemok) console.log(`  - 제목: ${jemok.name} (현재 순서: ${jemok.display_order})`)
    
    // 3. 순서 변경: 중심내용(0) → 주제(1) → 제목(2)
    // 또는 요지가 있다면: 요지(0) → 주제(1) → 제목(2)
    const updates = []
    
    if (jungsim) updates.push({ id: jungsim.id, name: jungsim.name, newOrder: 0 })
    if (juje) updates.push({ id: juje.id, name: juje.name, newOrder: 1 })
    if (jemok) updates.push({ id: jemok.id, name: jemok.name, newOrder: 2 })
    
    console.log('\n🔄 순서 변경 중...')
    console.log('   목표: 중심내용(0) → 주제(1) → 제목(2)')
    
    for (const update of updates) {
      const res = await fetch(`${API_URL}/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: update.newOrder })
      })
      
      if (res.ok) {
        console.log(`  ✅ ${update.name} → display_order: ${update.newOrder}`)
      } else {
        const error = await res.text()
        console.log(`  ❌ ${update.name} 변경 실패: ${error}`)
      }
    }
    
    console.log('\n✨ 완료!')
    
  } catch (error) {
    console.error('오류 발생:', error)
  }
}

reorderQuestionTypes()

