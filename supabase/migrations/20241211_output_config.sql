-- 출력 설정 v2.0 마이그레이션
-- question_types 테이블에 output_config 컬럼 추가

-- 1. output_config 컬럼 추가
ALTER TABLE question_types 
ADD COLUMN IF NOT EXISTS output_config JSONB DEFAULT NULL;

-- 2. 레이아웃 즐겨찾기 테이블 생성
CREATE TABLE IF NOT EXISTS layout_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 레이아웃 즐겨찾기 인덱스
CREATE INDEX IF NOT EXISTS idx_layout_favorites_name 
ON layout_favorites(name);

CREATE INDEX IF NOT EXISTS idx_layout_favorites_created_at 
ON layout_favorites(created_at DESC);

-- 4. output_config 인덱스 (JSONB 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_question_types_output_config 
ON question_types USING gin(output_config);

-- 5. 기본 레이아웃 즐겨찾기 추가 (선택사항)
-- INSERT INTO layout_favorites (name, description, config) VALUES 
-- (
--   '기본 1단',
--   '기본 1단 레이아웃',
--   '{
--     "version": "2.0",
--     "columns": 1,
--     "fields": [
--       {"key": "passage", "label": "지문"},
--       {"key": "question", "label": "문제"},
--       {"key": "choices", "label": "선택지"},
--       {"key": "answer", "label": "정답", "showIn": ["student_answer", "teacher", "answer_only"]},
--       {"key": "explanation", "label": "해설", "showIn": ["teacher"]}
--     ],
--     "paper": {"size": "A4", "orientation": "portrait", "margins": {"top": 15, "bottom": 15, "left": 15, "right": 15}},
--     "typography": {"baseFontSize": 11, "lineHeight": 1.5, "minFontSize": 8},
--     "options": {"pageNumbers": true, "choiceMarker": "circled", "choiceLayout": "vertical"}
--   }'::jsonb
-- );

COMMENT ON COLUMN question_types.output_config IS '출력 설정 v2.0 (그리드+필드 구조)';
COMMENT ON TABLE layout_favorites IS '레이아웃 즐겨찾기';

