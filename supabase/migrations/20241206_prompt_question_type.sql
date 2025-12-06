-- 프롬프트를 문제 유형으로 자동 등록하는 기능
-- is_question_type = true인 프롬프트는 question_types에 자동 생성됨

-- 1. prompts 테이블에 is_question_type 컬럼 추가
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS is_question_type BOOLEAN DEFAULT FALSE;

-- 2. prompts 테이블에 question_group 컬럼 추가 (문제 유형 그룹)
ALTER TABLE prompts 
ADD COLUMN IF NOT EXISTS question_group TEXT DEFAULT 'practical'
CHECK (question_group IN ('practical', 'selection', 'writing', 'analysis', 'vocabulary'));

-- 3. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_prompts_is_question_type 
ON prompts(is_question_type) WHERE is_question_type = TRUE;

-- 4. 코멘트 추가
COMMENT ON COLUMN prompts.is_question_type IS '문제 유형으로 사용 여부. TRUE이면 question_types에 자동 생성됨';
COMMENT ON COLUMN prompts.question_group IS '문제 유형 그룹 (practical/selection/writing/analysis/vocabulary)';


