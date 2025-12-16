-- ============================================
-- 블록 정의 테이블 생성
-- 마이그레이션 파일: 20241211_block_definitions.sql
-- ============================================

-- 1. block_definitions 테이블 생성 (블록 템플릿)
CREATE TABLE IF NOT EXISTS block_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'bundle' CHECK (type IN ('single', 'bundle')),
  unit TEXT NOT NULL DEFAULT 'passage' CHECK (unit IN ('passage', 'sentence')),
  prompt TEXT NOT NULL,
  prompt_version INT DEFAULT 1,
  output_fields JSONB DEFAULT '[]',  -- AI 응답에서 추출할 필드 목록 (예: [{"key": "choices", "type": "array"}])
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. block_instances 테이블 생성 (생성된 블록 데이터)
CREATE TABLE IF NOT EXISTS block_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_def_id UUID NOT NULL REFERENCES block_definitions(id) ON DELETE CASCADE,
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  sentence_index INT DEFAULT -1,  -- -1이면 지문 단위, 0 이상이면 문장 인덱스
  content JSONB NOT NULL DEFAULT '{}',  -- AI가 생성한 실제 JSON 데이터
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  generated_with_version INT,  -- 생성 당시 block_definitions.prompt_version
  model_used TEXT,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(block_def_id, passage_id, sentence_index)
);

-- 3. question_types 테이블에 block_id 컬럼 추가 (1문제유형 = 1블록)
ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES block_definitions(id) ON DELETE SET NULL;

-- 4. 기존 required_block_ids 컬럼 유지 (호환성)
ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS required_block_ids UUID[] DEFAULT '{}';

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_block_definitions_label ON block_definitions(label);
CREATE INDEX IF NOT EXISTS idx_block_definitions_type ON block_definitions(type);
CREATE INDEX IF NOT EXISTS idx_block_definitions_is_active ON block_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_block_instances_block_def ON block_instances(block_def_id);
CREATE INDEX IF NOT EXISTS idx_block_instances_passage ON block_instances(passage_id);
CREATE INDEX IF NOT EXISTS idx_block_instances_status ON block_instances(status);
CREATE INDEX IF NOT EXISTS idx_question_types_block_id ON question_types(block_id);

-- 6. 트리거: updated_at 자동 갱신
DROP TRIGGER IF EXISTS update_block_definitions_updated_at ON block_definitions;
CREATE TRIGGER update_block_definitions_updated_at
  BEFORE UPDATE ON block_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_block_instances_updated_at ON block_instances;
CREATE TRIGGER update_block_instances_updated_at
  BEFORE UPDATE ON block_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 코멘트 추가
COMMENT ON TABLE block_definitions IS '블록 정의 (AI 프롬프트 템플릿)';
COMMENT ON COLUMN block_definitions.type IS 'single: 단일 출력, bundle: 복합 출력 (passage, choices, answer 등)';
COMMENT ON COLUMN block_definitions.unit IS 'passage: 지문 단위, sentence: 문장 단위';
COMMENT ON COLUMN block_definitions.output_fields IS 'AI 응답에서 추출할 필드 정의 [{key, type, sample?}]';

COMMENT ON TABLE block_instances IS '생성된 블록 인스턴스 (AI 출력 데이터)';
COMMENT ON COLUMN block_instances.sentence_index IS '-1이면 지문 단위, 0 이상이면 해당 문장 인덱스';
COMMENT ON COLUMN block_instances.content IS 'AI가 생성한 실제 JSON 데이터';

-- ============================================
-- 완료!
-- ============================================

