-- ============================================
-- 그룹 및 교재 순서 관리 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. 그룹 순서 관리
-- ============================================

-- groups 테이블에 order_index 컬럼 추가
ALTER TABLE groups 
ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;

-- 기존 그룹에 순서 부여 (created_at 기준)
WITH ordered_groups AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 AS new_order
  FROM groups
)
UPDATE groups
SET order_index = ordered_groups.new_order
FROM ordered_groups
WHERE groups.id = ordered_groups.id;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_groups_order_index ON groups(order_index);

-- ============================================
-- 2. 교재 순서 관리
-- ============================================

-- textbooks 테이블에 order_index 컬럼 추가
ALTER TABLE textbooks 
ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;

-- 기존 교재에 순서 부여 (그룹별, created_at 기준)
WITH ordered_textbooks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at) - 1 AS new_order
  FROM textbooks
)
UPDATE textbooks
SET order_index = ordered_textbooks.new_order
FROM ordered_textbooks
WHERE textbooks.id = ordered_textbooks.id;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_textbooks_order_index ON textbooks(group_id, order_index);

-- ============================================
-- 완료!
-- ============================================

