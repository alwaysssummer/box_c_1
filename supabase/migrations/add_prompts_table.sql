-- ============================================
-- 프롬프트 라이브러리 테이블 추가 마이그레이션
-- ============================================
-- 기존 Supabase 프로젝트에 이 SQL을 실행하여 프롬프트 관련 테이블을 추가합니다.

-- 1. 프롬프트 테이블 생성
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  target TEXT CHECK (target IN ('passage', 'sentence')) DEFAULT 'passage',
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  output_schema TEXT,
  sample_input TEXT,
  sample_output TEXT,
  test_passage_id UUID REFERENCES passages(id) ON DELETE SET NULL,
  preferred_model TEXT DEFAULT 'gpt-4o-mini',
  status TEXT CHECK (status IN ('draft', 'testing', 'confirmed')) DEFAULT 'draft',
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 프롬프트 테스트 기록 테이블 생성
CREATE TABLE IF NOT EXISTS prompt_test_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_text TEXT NOT NULL,
  output_text TEXT,
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  response_time INT,
  input_tokens INT,
  output_tokens INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 데이터 유형 테이블에 prompt_id 컬럼 추가
ALTER TABLE data_types 
ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL;

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompt_test_history_prompt_id ON prompt_test_history(prompt_id);
CREATE INDEX IF NOT EXISTS idx_data_types_prompt_id ON data_types(prompt_id);

-- 5. updated_at 트리거 적용
CREATE OR REPLACE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS 정책 설정
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_history ENABLE ROW LEVEL SECURITY;

-- MVP용: 모든 사용자에게 전체 접근 허용
CREATE POLICY "Allow all access to prompts" ON prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prompt_test_history" ON prompt_test_history FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 완료!
-- ============================================




