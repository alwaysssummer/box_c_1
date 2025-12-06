-- 문제 유형에 프롬프트 직접 연결 기능 추가
-- 프롬프트가 연결되면: 프롬프트 직접 생성 (사전데이터 검증 없음)
-- 프롬프트가 없으면: 슬롯 기반 조합 (기존 2단계 시스템)

-- 1. question_types 테이블에 prompt_id 컬럼 추가
ALTER TABLE question_types 
ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL;

-- 2. 인덱스 추가 (조회 성능)
CREATE INDEX IF NOT EXISTS idx_question_types_prompt_id 
ON question_types(prompt_id);

-- 3. 코멘트 추가
COMMENT ON COLUMN question_types.prompt_id IS '프롬프트 직접 연결. NULL이면 슬롯 기반 조합, 값이 있으면 프롬프트 직접 생성';


