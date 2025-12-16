-- print_layouts 테이블 생성 (프레임+블록 기반 출력 레이아웃)
CREATE TABLE IF NOT EXISTS print_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'passage', -- 'passage' | 'sentence'
  
  -- 레이아웃 설정 (JSON)
  config JSONB NOT NULL DEFAULT '{}',
  
  -- 스타일 설정 (JSON)
  style JSONB DEFAULT '{}',
  
  -- 기본 레이아웃 여부
  is_default BOOLEAN DEFAULT FALSE,
  
  -- 정렬 순서
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_print_layouts_category ON print_layouts(category);
CREATE INDEX idx_print_layouts_is_default ON print_layouts(is_default);

-- 기본 레이아웃 데이터 삽입
INSERT INTO print_layouts (name, description, category, config, style, is_default, sort_order) VALUES
-- 지문형 레이아웃
(
  '2단 (지문 좌측)',
  '지문이 좌측에, 문제가 우측에 배치됩니다',
  'passage',
  '{"columns": 2, "passagePosition": "left", "showPassageOnce": true}',
  '{"fontSize": 10, "lineHeight": 1.6}',
  true,
  1
),
(
  '2단 (지문 상단)',
  '지문이 상단에, 문제들이 하단 2열로 배치됩니다',
  'passage',
  '{"columns": 2, "passagePosition": "top", "showPassageOnce": true}',
  '{"fontSize": 10, "lineHeight": 1.6}',
  false,
  2
),
(
  '1단 (세로)',
  '지문과 문제가 세로로 나열됩니다',
  'passage',
  '{"columns": 1, "passagePosition": "top", "showPassageOnce": true}',
  '{"fontSize": 10, "lineHeight": 1.6}',
  false,
  3
),
-- 문장형 레이아웃
(
  '영한 대조 (2열)',
  '원문과 해석이 좌우로 나란히 배치됩니다',
  'sentence',
  '{"frame": {"merge": {"left": true, "right": true}, "cells": {"A": "original", "B": "translation"}}, "showSentenceNumber": true}',
  '{"fontSize": 10, "lineHeight": 1.6}',
  false,
  4
),
(
  '끊어읽기',
  '원문이 상단, 해석과 어휘가 하단에 배치됩니다',
  'sentence',
  '{"frame": {"merge": {"top": true}, "cells": {"A": "original", "C": "translation", "D": "vocabulary"}}, "showSentenceNumber": true}',
  '{"fontSize": 10, "lineHeight": 1.6}',
  false,
  5
),
(
  '4분할 종합',
  '원문, 해석, 어휘, 문법이 4칸에 배치됩니다',
  'sentence',
  '{"frame": {"cells": {"A": "original", "B": "vocabulary", "C": "translation", "D": "grammar"}}, "showSentenceNumber": true}',
  '{"fontSize": 9, "lineHeight": 1.5}',
  false,
  6
);

-- question_types 테이블에 print_layout_id 컬럼 추가
ALTER TABLE question_types 
ADD COLUMN IF NOT EXISTS print_layout_id UUID REFERENCES print_layouts(id) ON DELETE SET NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_question_types_print_layout ON question_types(print_layout_id);

-- 트리거: updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_print_layouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_print_layouts_updated_at
  BEFORE UPDATE ON print_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_print_layouts_updated_at();












