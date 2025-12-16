-- ============================================
-- 새로운 블록 기반 출제 시스템
-- 마이그레이션 파일: 20241210_new_block_system.sql
-- ============================================

-- 1. blocks 테이블 생성
-- 모든 생성된 데이터를 블록으로 중앙 관리
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 위치 정보
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  sentence_index INTEGER NULL,  -- NULL이면 지문 단위, 숫자면 문장 단위
  
  -- 블록 식별
  label VARCHAR(100) NOT NULL,  -- 예: "요지", "주제", "제목", "단어장", "본문"
  unit VARCHAR(20) NOT NULL DEFAULT 'passage' CHECK (unit IN ('passage', 'sentence')),
  
  -- 프롬프트 연결 (NULL이면 원본 데이터)
  prompt_id UUID REFERENCES prompts(id),
  
  -- 콘텐츠
  content JSONB NOT NULL DEFAULT '{}',  -- 블록의 실제 데이터
  
  -- 메타데이터
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT NULL,
  model_used VARCHAR(100) NULL,
  tokens_used INTEGER NULL,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 중복 방지: 같은 지문/문장에서 같은 라벨의 블록은 하나만
  UNIQUE(passage_id, COALESCE(sentence_index, -1), label)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_blocks_passage ON blocks(passage_id);
CREATE INDEX IF NOT EXISTS idx_blocks_label ON blocks(label);
CREATE INDEX IF NOT EXISTS idx_blocks_passage_label ON blocks(passage_id, label);
CREATE INDEX IF NOT EXISTS idx_blocks_status ON blocks(status);

-- 2. question_types 테이블 확장
-- 탑다운 방식을 위한 새 컬럼 추가
ALTER TABLE question_types
  ADD COLUMN IF NOT EXISTS required_blocks JSONB DEFAULT '[]',  -- 필요한 블록 라벨 목록
  ADD COLUMN IF NOT EXISTS block_prompts JSONB DEFAULT '{}',    -- 블록별 프롬프트 매핑
  ADD COLUMN IF NOT EXISTS layout JSONB DEFAULT '{"columns": 1}',  -- 출력 레이아웃 설정
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'passage';  -- 'passage' 또는 'sentence'

-- 3. generated_questions 테이블 확장
-- 블록 참조 추가
ALTER TABLE generated_questions
  ADD COLUMN IF NOT EXISTS block_ids JSONB DEFAULT '[]',  -- 사용된 블록 ID 목록
  ADD COLUMN IF NOT EXISTS sentence_index INTEGER NULL;   -- 문장 단위일 경우

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_generated_questions_sentence ON generated_questions(passage_id, sentence_index);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- blocks 테이블에 트리거 적용
DROP TRIGGER IF EXISTS update_blocks_updated_at ON blocks;
CREATE TRIGGER update_blocks_updated_at
    BEFORE UPDATE ON blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 코멘트 추가
-- ============================================
COMMENT ON TABLE blocks IS '블록 중앙 관리 테이블 - 모든 생성 데이터를 블록으로 저장';
COMMENT ON COLUMN blocks.label IS '블록 라벨: 요지, 주제, 제목, 단어장, 본문 등';
COMMENT ON COLUMN blocks.unit IS '블록 단위: passage(지문) 또는 sentence(문장)';
COMMENT ON COLUMN blocks.sentence_index IS 'NULL이면 지문 단위, 숫자면 해당 문장 인덱스';
COMMENT ON COLUMN blocks.content IS '블록의 실제 데이터 (JSON)';

COMMENT ON COLUMN question_types.required_blocks IS '이 문제 유형이 필요로 하는 블록 라벨 목록';
COMMENT ON COLUMN question_types.block_prompts IS '블록 라벨별 프롬프트 ID 매핑';
COMMENT ON COLUMN question_types.layout IS '출력 레이아웃 설정 (columns, left, right 등)';
COMMENT ON COLUMN question_types.unit IS '문제 유형 단위: passage 또는 sentence';

COMMENT ON COLUMN generated_questions.block_ids IS '이 문제 생성에 사용된 블록 ID 목록';
COMMENT ON COLUMN generated_questions.sentence_index IS '문장 단위 문제의 경우 문장 인덱스';












