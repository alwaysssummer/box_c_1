-- ============================================
-- 다중 문제 지원을 위한 sub_questions 컬럼 추가
-- ============================================
-- 1지문 N문제 (예: 요지/주제/제목 통합) 지원

-- 1. sub_questions 컬럼 추가
-- 형식: JSONB 배열
-- [{
--   "questionNumber": 1,
--   "type": "요지",
--   "instruction": "다음 글의 요지로...",
--   "body": "지문 내용",
--   "choices": "① ... ② ...",
--   "answer": "②",
--   "explanation": "해설..."
-- }, ...]
ALTER TABLE generated_questions 
ADD COLUMN IF NOT EXISTS sub_questions JSONB DEFAULT NULL;

-- 2. raw_content 컬럼 추가 (AI 원본 응답 저장)
ALTER TABLE generated_questions 
ADD COLUMN IF NOT EXISTS raw_content TEXT DEFAULT NULL;

-- 3. 코멘트 추가
COMMENT ON COLUMN generated_questions.sub_questions IS '다중 문제 데이터 (1지문 N문제)';
COMMENT ON COLUMN generated_questions.raw_content IS 'AI 원본 응답 (파싱 전)';

-- 4. 기존 status 체크 제약조건 업데이트 (warning 상태 추가)
ALTER TABLE generated_questions 
DROP CONSTRAINT IF EXISTS generated_questions_status_check;

ALTER TABLE generated_questions
ADD CONSTRAINT generated_questions_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'warning'));

