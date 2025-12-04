-- ============================================
-- 문제출제 관리 시스템 - Supabase 스키마
-- ============================================
-- 이 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요.
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================
-- 1. 교재 관련 테이블
-- ============================================

-- 그룹 테이블
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 교재 테이블
CREATE TABLE IF NOT EXISTS textbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  google_sheet_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 단원 테이블
CREATE TABLE IF NOT EXISTS units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  textbook_id UUID NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 지문 테이블
CREATE TABLE IF NOT EXISTS passages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT,
  korean_translation TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 프롬프트 라이브러리 테이블
-- ============================================

-- 프롬프트 카테고리
-- general: 일반, extraction: 추출, generation: 생성, analysis: 분석

-- 프롬프트 정의 (독립 엔티티)
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

-- 프롬프트 테스트 기록
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

-- ============================================
-- 3. 데이터 유형 테이블
-- ============================================

-- 데이터 유형 정의
CREATE TABLE IF NOT EXISTS data_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  target TEXT CHECK (target IN ('passage', 'sentence')) DEFAULT 'passage',
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  prompt TEXT,
  output_schema JSONB,
  sample_result TEXT,
  has_answer BOOLEAN DEFAULT FALSE,
  answer_format TEXT,
  has_dependency BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 데이터 유형 의존성
CREATE TABLE IF NOT EXISTS data_type_dependencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_type_id UUID NOT NULL REFERENCES data_types(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES data_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data_type_id, depends_on_id)
);

-- ============================================
-- 4. 문제 유형 테이블
-- ============================================

-- 문제 유형 정의
CREATE TABLE IF NOT EXISTS question_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  instruction TEXT,
  choice_layout TEXT DEFAULT 'vertical',
  choice_marker TEXT DEFAULT 'circle',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 문제 유형 - 데이터 유형 조합
CREATE TABLE IF NOT EXISTS question_type_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_type_id UUID NOT NULL REFERENCES question_types(id) ON DELETE CASCADE,
  data_type_id UUID NOT NULL REFERENCES data_types(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('body', 'choices', 'answer', 'explanation')) DEFAULT 'body',
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 생성 결과 테이블
-- ============================================

-- 생성된 데이터 (AI 결과물)
CREATE TABLE IF NOT EXISTS generated_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  data_type_id UUID NOT NULL REFERENCES data_types(id) ON DELETE CASCADE,
  result JSONB,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(passage_id, data_type_id)
);

-- 생성된 문제
CREATE TABLE IF NOT EXISTS generated_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  question_type_id UUID NOT NULL REFERENCES question_types(id) ON DELETE CASCADE,
  instruction TEXT,
  body TEXT,
  choices JSONB,
  answer TEXT,
  explanation TEXT,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 인덱스 생성
-- ============================================

CREATE INDEX IF NOT EXISTS idx_textbooks_group_id ON textbooks(group_id);
CREATE INDEX IF NOT EXISTS idx_units_textbook_id ON units(textbook_id);
CREATE INDEX IF NOT EXISTS idx_passages_unit_id ON passages(unit_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
CREATE INDEX IF NOT EXISTS idx_prompt_test_history_prompt_id ON prompt_test_history(prompt_id);
CREATE INDEX IF NOT EXISTS idx_data_types_prompt_id ON data_types(prompt_id);
CREATE INDEX IF NOT EXISTS idx_data_type_dependencies_data_type_id ON data_type_dependencies(data_type_id);
CREATE INDEX IF NOT EXISTS idx_question_type_items_question_type_id ON question_type_items(question_type_id);
CREATE INDEX IF NOT EXISTS idx_generated_data_passage_id ON generated_data(passage_id);
CREATE INDEX IF NOT EXISTS idx_generated_data_data_type_id ON generated_data(data_type_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_passage_id ON generated_questions(passage_id);
CREATE INDEX IF NOT EXISTS idx_generated_questions_question_type_id ON generated_questions(question_type_id);

-- ============================================
-- 7. updated_at 자동 업데이트 트리거
-- ============================================

-- 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 각 테이블에 트리거 적용
CREATE OR REPLACE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_textbooks_updated_at
  BEFORE UPDATE ON textbooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_data_types_updated_at
  BEFORE UPDATE ON data_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_question_types_updated_at
  BEFORE UPDATE ON question_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_generated_data_updated_at
  BEFORE UPDATE ON generated_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_generated_questions_updated_at
  BEFORE UPDATE ON generated_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. RLS (Row Level Security) 정책
-- ============================================
-- MVP에서는 인증 없이 사용하므로 모든 접근 허용
-- 프로덕션에서는 적절한 RLS 정책 설정 필요

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_type_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_type_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_questions ENABLE ROW LEVEL SECURITY;

-- MVP용: 모든 사용자에게 전체 접근 허용
CREATE POLICY "Allow all access to groups" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to textbooks" ON textbooks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to units" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to passages" ON passages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prompts" ON prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to prompt_test_history" ON prompt_test_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to data_types" ON data_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to data_type_dependencies" ON data_type_dependencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to question_types" ON question_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to question_type_items" ON question_type_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to generated_data" ON generated_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to generated_questions" ON generated_questions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 완료!
-- ============================================
-- 위 SQL을 실행한 후, Supabase Dashboard에서 
-- API URL과 anon key를 복사하여 .env.local에 설정하세요.
