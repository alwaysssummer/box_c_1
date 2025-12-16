-- question_types 테이블에 frame_config 컬럼 추가
-- 기존 print_layout_id 대신 직접 프레임 설정을 저장

-- 1. frame_config 컬럼 추가
ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS frame_config JSONB DEFAULT '{
  "layout": "2-column",
  "cells": {
    "left": ["passage"],
    "right": ["question"]
  },
  "style": {
    "fontSize": 10,
    "lineHeight": 1.6
  }
}'::jsonb;

-- 2. 기존 print_layout_id 컬럼 제거 (더 이상 사용 안 함)
-- ALTER TABLE question_types DROP COLUMN IF EXISTS print_layout_id;
-- 주의: 데이터 손실 가능, 필요시 주석 해제

-- 3. 인덱스 추가 (JSONB 검색용)
CREATE INDEX IF NOT EXISTS idx_question_types_frame_config ON question_types USING GIN (frame_config);

COMMENT ON COLUMN question_types.frame_config IS '출력 프레임 설정 (layout, cells, style)';












