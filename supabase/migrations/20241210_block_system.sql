-- ============================================
-- 블록 기반 문제 출제 시스템 - 마이그레이션
-- ============================================

-- 1. 블록 정의 테이블 (템플릿)
CREATE TABLE IF NOT EXISTS block_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('single', 'bundle')),
  unit TEXT NOT NULL CHECK (unit IN ('passage', 'sentence')) DEFAULT 'passage',
  prompt TEXT NOT NULL,
  prompt_version INT DEFAULT 1,
  output_fields TEXT[] DEFAULT '{}',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 블록 인스턴스 테이블 (생성 결과)
CREATE TABLE IF NOT EXISTS block_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_def_id UUID NOT NULL REFERENCES block_definitions(id) ON DELETE CASCADE,
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  sentence_index INT DEFAULT -1,
  content JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  generated_with_version INT,
  model_used TEXT,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(block_def_id, passage_id, sentence_index)
);

-- 3. question_types 테이블 확장
ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS required_block_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS layout_config JSONB DEFAULT '{}';

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_block_definitions_label ON block_definitions(label);
CREATE INDEX IF NOT EXISTS idx_block_definitions_type ON block_definitions(type);
CREATE INDEX IF NOT EXISTS idx_block_instances_block_def ON block_instances(block_def_id);
CREATE INDEX IF NOT EXISTS idx_block_instances_passage ON block_instances(passage_id);
CREATE INDEX IF NOT EXISTS idx_block_instances_status ON block_instances(status);

-- 5. 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_block_definitions_updated_at ON block_definitions;
CREATE TRIGGER update_block_definitions_updated_at
  BEFORE UPDATE ON block_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_block_instances_updated_at ON block_instances;
CREATE TRIGGER update_block_instances_updated_at
  BEFORE UPDATE ON block_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 코멘트
COMMENT ON TABLE block_definitions IS '블록 정의 (템플릿) - 프롬프트와 설정을 담은 재사용 가능한 블록';
COMMENT ON TABLE block_instances IS '블록 인스턴스 - 특정 지문에 대해 생성된 실제 데이터';
COMMENT ON COLUMN block_definitions.type IS 'single: 단일 블록 (재사용 가능), bundle: 묶음 블록 (통째로 사용)';
COMMENT ON COLUMN block_definitions.unit IS 'passage: 지문 단위, sentence: 문장 단위';
COMMENT ON COLUMN block_instances.generated_with_version IS '생성 당시 프롬프트 버전';

