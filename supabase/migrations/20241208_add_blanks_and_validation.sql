-- 통합형 문제를 위한 blanks 컬럼 추가
-- 형식: JSONB 배열 [{ id: "(a)", choices: [...], answer: "①" }, ...]

ALTER TABLE generated_questions 
ADD COLUMN IF NOT EXISTS blanks JSONB DEFAULT NULL;

-- 검증 상태 컬럼 추가
ALTER TABLE generated_questions 
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'success';

-- 검증 메시지 컬럼 추가
ALTER TABLE generated_questions 
ADD COLUMN IF NOT EXISTS validation_message TEXT DEFAULT NULL;

-- 인덱스 추가 (검증 상태로 필터링 시 성능 개선)
CREATE INDEX IF NOT EXISTS idx_generated_questions_validation_status 
ON generated_questions(validation_status);

-- 코멘트 추가
COMMENT ON COLUMN generated_questions.blanks IS '통합형 문제의 빈칸 데이터 (1지문 N문제)';
COMMENT ON COLUMN generated_questions.validation_status IS '검증 상태: success, warning, error';
COMMENT ON COLUMN generated_questions.validation_message IS '검증 결과 메시지';


















