// 직접 question_types 생성 스크립트
// Node.js 18+ 내장 fetch 사용

async function main() {
  const promptId = '4e79d5b8-1f9d-44a4-86b7-c69899d55d36';
  
  // Step 1: false로 변경
  console.log('Step 1: Setting isQuestionType to false...');
  const res1 = await fetch(`http://localhost:3000/api/prompts/${promptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isQuestionType: false })
  });
  console.log('Step 1 result:', res1.status);
  
  // Step 2: true로 변경 (이때 question_types 생성됨)
  console.log('Step 2: Setting isQuestionType to true...');
  const res2 = await fetch(`http://localhost:3000/api/prompts/${promptId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isQuestionType: true, questionGroup: 'practical' })
  });
  console.log('Step 2 result:', res2.status);
  
  // 확인
  console.log('Checking question types...');
  const res3 = await fetch('http://localhost:3000/api/question-types');
  const data = await res3.json();
  console.log('Question types:', data.map(q => ({ name: q.name, prompt_id: q.prompt_id })));
}

main().catch(console.error);

