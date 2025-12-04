-- ============================================
-- 데이터 생성 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. generated_data 테이블 생성 (없는 경우)
-- ============================================

CREATE TABLE IF NOT EXISTS generated_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE,
  data_type_id UUID NOT NULL REFERENCES data_types(id) ON DELETE CASCADE,
  result JSONB,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  model_used TEXT,
  confidence DECIMAL(3, 2),
  response_time INT, -- milliseconds
  input_tokens INT,
  output_tokens INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 1.5. 컬럼 추가 (테이블이 이미 존재하는 경우)
-- ============================================

DO $$ 
BEGIN
  -- confidence 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_data' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE generated_data ADD COLUMN confidence DECIMAL(3, 2);
  END IF;
  
  -- response_time 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_data' AND column_name = 'response_time'
  ) THEN
    ALTER TABLE generated_data ADD COLUMN response_time INT;
  END IF;
  
  -- input_tokens 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_data' AND column_name = 'input_tokens'
  ) THEN
    ALTER TABLE generated_data ADD COLUMN input_tokens INT;
  END IF;
  
  -- output_tokens 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_data' AND column_name = 'output_tokens'
  ) THEN
    ALTER TABLE generated_data ADD COLUMN output_tokens INT;
  END IF;
  
  -- model_used 컬럼 추가
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'generated_data' AND column_name = 'model_used'
  ) THEN
    ALTER TABLE generated_data ADD COLUMN model_used TEXT;
  END IF;
END $$;

-- ============================================
-- 2. 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_generated_data_passage_id ON generated_data(passage_id);
CREATE INDEX IF NOT EXISTS idx_generated_data_sentence_id ON generated_data(sentence_id);
CREATE INDEX IF NOT EXISTS idx_generated_data_data_type_id ON generated_data(data_type_id);
CREATE INDEX IF NOT EXISTS idx_generated_data_status ON generated_data(status);

-- UNIQUE 제약 조건: passage_id + data_type_id + sentence_id 조합은 유일해야 함
-- 지문 단위: sentence_id가 NULL
-- 문장 단위: sentence_id가 NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_data_unique 
ON generated_data(passage_id, data_type_id, COALESCE(sentence_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================
-- 3. RLS 활성화
-- ============================================

ALTER TABLE generated_data ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있는 경우)
DROP POLICY IF EXISTS "Allow all access to generated_data" ON generated_data;

-- 새 정책 생성
CREATE POLICY "Allow all access to generated_data" 
ON generated_data FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================
-- 4. updated_at 트리거
-- ============================================

-- 트리거 함수가 없으면 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거 삭제 (있는 경우)
DROP TRIGGER IF EXISTS update_generated_data_updated_at ON generated_data;

-- 새 트리거 생성
CREATE TRIGGER update_generated_data_updated_at
  BEFORE UPDATE ON generated_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. data_types에 prompt_id 외래키 추가 (없는 경우)
-- ============================================

-- prompt_id가 prompts 테이블을 참조하도록 외래키 제약 추가
-- (이미 있으면 무시됨)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'data_types_prompt_id_fkey'
  ) THEN
    ALTER TABLE data_types 
    ADD CONSTRAINT data_types_prompt_id_fkey 
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 6. 통계 뷰 생성 (optional)
-- ============================================

CREATE OR REPLACE VIEW data_generation_stats AS
SELECT 
  p.id AS passage_id,
  p.name AS passage_name,
  u.name AS unit_name,
  t.name AS textbook_name,
  g.name AS group_name,
  COUNT(gd.id) AS total_generated,
  COUNT(CASE WHEN gd.status = 'completed' THEN 1 END) AS completed_count,
  COUNT(CASE WHEN gd.status = 'failed' THEN 1 END) AS failed_count,
  COUNT(CASE WHEN gd.status = 'pending' THEN 1 END) AS pending_count,
  AVG(gd.confidence) AS avg_confidence
FROM passages p
LEFT JOIN units u ON p.unit_id = u.id
LEFT JOIN textbooks t ON u.textbook_id = t.id
LEFT JOIN groups g ON t.group_id = g.id
LEFT JOIN generated_data gd ON p.id = gd.passage_id
GROUP BY p.id, p.name, u.name, t.name, g.name;

-- ============================================
-- 완료!
-- ============================================
