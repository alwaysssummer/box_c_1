-- ============================================
-- 문장 분리 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. sentences 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS sentences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  sentence_no INT NOT NULL,
  content TEXT NOT NULL,
  korean_translation TEXT,
  word_count INT,
  confidence DECIMAL(3, 2) DEFAULT 1.00,
  split_method TEXT CHECK (split_method IN ('regex', 'ai', 'manual', 'hybrid')) DEFAULT 'hybrid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(passage_id, sentence_no)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sentences_passage_id ON sentences(passage_id);
CREATE INDEX IF NOT EXISTS idx_sentences_sentence_no ON sentences(sentence_no);

-- RLS 활성화
ALTER TABLE sentences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sentences" ON sentences FOR ALL USING (true) WITH CHECK (true);

-- updated_at 트리거
CREATE OR REPLACE TRIGGER update_sentences_updated_at
  BEFORE UPDATE ON sentences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. generated_data에 sentence_id 컬럼 추가
-- ============================================

-- sentence_id 컬럼 추가
ALTER TABLE generated_data 
ADD COLUMN IF NOT EXISTS sentence_id UUID REFERENCES sentences(id) ON DELETE CASCADE;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generated_data_sentence_id ON generated_data(sentence_id);

-- 기존 UNIQUE 제약 조건 삭제 (있는 경우)
ALTER TABLE generated_data DROP CONSTRAINT IF EXISTS generated_data_passage_id_data_type_id_key;

-- 새로운 UNIQUE 제약 조건 (passage_id + data_type_id + sentence_id)
-- 지문 단위: sentence_id가 NULL
-- 문장 단위: sentence_id가 NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_generated_data_unique 
ON generated_data(passage_id, data_type_id, COALESCE(sentence_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ============================================
-- 3. data_types에 난이도/모델 컬럼 추가
-- ============================================

ALTER TABLE data_types 
ADD COLUMN IF NOT EXISTS difficulty TEXT 
  CHECK (difficulty IN ('simple', 'medium', 'complex')) 
  DEFAULT 'medium';

ALTER TABLE data_types 
ADD COLUMN IF NOT EXISTS recommended_model TEXT DEFAULT 'gpt-4o-mini';

-- ============================================
-- 4. 시스템 설정 테이블 (AI 모델 기본 설정)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_model_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL, -- 'sentence_split', 'translation', 'data_generation'
  difficulty TEXT CHECK (difficulty IN ('simple', 'medium', 'complex')),
  preferred_model TEXT NOT NULL,
  fallback_model TEXT,
  cost_per_1k_tokens DECIMAL(10, 6),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_type, difficulty)
);

-- RLS 활성화
ALTER TABLE ai_model_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to ai_model_config" ON ai_model_config FOR ALL USING (true) WITH CHECK (true);

-- 기본 설정 삽입 (중복 방지)
INSERT INTO ai_model_config (task_type, difficulty, preferred_model, fallback_model, cost_per_1k_tokens, description) 
VALUES
  ('sentence_split', 'simple', 'gemini-1.5-flash', 'gpt-4o-mini', 0.000075, '문장 분리 - 빠르고 저렴'),
  ('sentence_split', 'medium', 'gpt-4o-mini', 'gemini-1.5-flash', 0.00015, '문장 분리 - 복잡한 약어 처리'),
  ('translation', 'simple', 'gpt-4o-mini', 'gemini-1.5-flash', 0.00015, '번역 생성/검증'),
  ('data_generation', 'simple', 'gemini-1.5-flash', 'gpt-4o-mini', 0.000075, '단순 추출 작업'),
  ('data_generation', 'medium', 'gpt-4o-mini', 'gemini-1.5-pro', 0.00015, '중간 복잡도 작업'),
  ('data_generation', 'complex', 'gpt-4o', 'claude-3-5-sonnet-20241022', 0.005, '복잡한 분석/생성')
ON CONFLICT (task_type, difficulty) DO NOTHING;

-- ============================================
-- 5. passages 테이블에 문장 분리 상태 컬럼 추가
-- ============================================

ALTER TABLE passages 
ADD COLUMN IF NOT EXISTS sentence_split_status TEXT 
  CHECK (sentence_split_status IN ('pending', 'processing', 'completed', 'failed')) 
  DEFAULT 'pending';

ALTER TABLE passages 
ADD COLUMN IF NOT EXISTS sentence_count INT DEFAULT 0;

ALTER TABLE passages 
ADD COLUMN IF NOT EXISTS split_model TEXT;

ALTER TABLE passages 
ADD COLUMN IF NOT EXISTS split_confidence DECIMAL(3, 2);

-- ============================================
-- 완료!
-- ============================================



































