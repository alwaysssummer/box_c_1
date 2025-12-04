-- ============================================
-- Phase 5: 출력 유형 확장 마이그레이션
-- 날짜: 2024-12-05
-- 설명: 데이터 유형과 출력 유형(question_types)을 확장하여
--       25종의 다양한 문제/학습자료 유형을 지원
-- ============================================

-- ============================================
-- 1. data_types 테이블 확장
-- ============================================

-- 1.1 카테고리 컬럼 추가 (base/analysis/transform/question)
ALTER TABLE data_types 
  ADD COLUMN IF NOT EXISTS category TEXT 
    CHECK (category IN ('base', 'analysis', 'transform', 'question')) 
    DEFAULT 'analysis';

-- 1.2 설정 컬럼 추가 (JSONB)
ALTER TABLE data_types 
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- 1.3 캐싱/재사용 설정
COMMENT ON COLUMN data_types.category IS '데이터 유형 카테고리: base(기본), analysis(분석), transform(변형), question(문제)';
COMMENT ON COLUMN data_types.config IS '추가 설정 (cacheable, reusable, batchable 등)';

-- ============================================
-- 2. question_types 테이블 확장 (→ 출력 유형으로 확장)
-- ============================================

-- 2.1 목적 컬럼 추가 (학습자료/문제)
ALTER TABLE question_types 
  ADD COLUMN IF NOT EXISTS purpose TEXT 
    CHECK (purpose IN ('learning', 'assessment')) 
    DEFAULT 'assessment';

-- 2.2 지문 변형 설정 컬럼 추가
ALTER TABLE question_types 
  ADD COLUMN IF NOT EXISTS passage_transform JSONB DEFAULT '{}';

-- 2.3 출력 설정 컬럼 추가
ALTER TABLE question_types 
  ADD COLUMN IF NOT EXISTS output_config JSONB DEFAULT '{}';

-- 2.4 템플릿 상속 컬럼 추가
ALTER TABLE question_types 
  ADD COLUMN IF NOT EXISTS extends_from UUID 
    REFERENCES question_types(id) ON DELETE SET NULL;

-- 2.5 설명 컬럼 추가
ALTER TABLE question_types 
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2.6 컬럼 설명 추가
COMMENT ON COLUMN question_types.purpose IS '출력 목적: learning(학습자료), assessment(문제)';
COMMENT ON COLUMN question_types.passage_transform IS '지문 변형 설정 (type: none/split/extract/delete/insert, config: {...})';
COMMENT ON COLUMN question_types.output_config IS '출력 설정 (requiresAnswer, requiresExplanation, answerFormat, choiceCount 등)';
COMMENT ON COLUMN question_types.extends_from IS '상속받는 템플릿 ID';
COMMENT ON COLUMN question_types.description IS '출력 유형 설명';

-- ============================================
-- 3. question_type_items 테이블 확장
-- ============================================

-- 3.1 설정 컬럼 추가
ALTER TABLE question_type_items 
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- 3.2 필수 여부 컬럼 추가
ALTER TABLE question_type_items 
  ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true;

COMMENT ON COLUMN question_type_items.config IS '데이터 유형별 추가 설정';
COMMENT ON COLUMN question_type_items.required IS '필수 데이터 유형 여부';

-- ============================================
-- 4. 인덱스 추가
-- ============================================

-- 데이터 유형 카테고리별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_data_types_category ON data_types(category);

-- 출력 유형 목적별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_question_types_purpose ON question_types(purpose);

-- 템플릿 상속 조회 최적화
CREATE INDEX IF NOT EXISTS idx_question_types_extends_from ON question_types(extends_from);

-- ============================================
-- 5. 기존 데이터 기본값 설정
-- ============================================

-- 기존 data_types에 기본 카테고리 설정
UPDATE data_types SET category = 'analysis' WHERE category IS NULL;

-- 기존 question_types에 기본 목적 설정
UPDATE question_types SET purpose = 'assessment' WHERE purpose IS NULL;

-- 기존 question_types에 기본 출력 설정
UPDATE question_types 
SET output_config = jsonb_build_object(
  'requiresAnswer', true,
  'requiresExplanation', true,
  'answerFormat', 'single',
  'choiceCount', 5
)
WHERE output_config = '{}' OR output_config IS NULL;

-- ============================================
-- 6. 뷰 생성: 출력 유형 상세 정보
-- ============================================

CREATE OR REPLACE VIEW output_type_details AS
SELECT 
  qt.id,
  qt.name,
  qt.description,
  qt.instruction,
  qt.purpose,
  qt.passage_transform,
  qt.output_config,
  qt.extends_from,
  qt.choice_layout,
  qt.choice_marker,
  qt.created_at,
  qt.updated_at,
  parent.name AS parent_template_name,
  COUNT(qti.id) AS data_type_count,
  ARRAY_AGG(dt.name ORDER BY qti.order_index) FILTER (WHERE dt.name IS NOT NULL) AS data_type_names
FROM question_types qt
LEFT JOIN question_types parent ON qt.extends_from = parent.id
LEFT JOIN question_type_items qti ON qt.id = qti.question_type_id
LEFT JOIN data_types dt ON qti.data_type_id = dt.id
GROUP BY qt.id, parent.name;

-- ============================================
-- 7. 함수: 템플릿에서 새 출력 유형 생성
-- ============================================

CREATE OR REPLACE FUNCTION create_output_type_from_template(
  p_template_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_config_overrides JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_new_id UUID;
  v_template RECORD;
BEGIN
  -- 템플릿 조회
  SELECT * INTO v_template FROM question_types WHERE id = p_template_id;
  
  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  -- 새 출력 유형 생성
  INSERT INTO question_types (
    name,
    description,
    instruction,
    purpose,
    passage_transform,
    output_config,
    extends_from,
    choice_layout,
    choice_marker
  )
  VALUES (
    p_name,
    COALESCE(p_description, v_template.description),
    v_template.instruction,
    v_template.purpose,
    COALESCE(p_config_overrides->'passage_transform', v_template.passage_transform),
    v_template.output_config || COALESCE(p_config_overrides->'output_config', '{}'),
    p_template_id,
    v_template.choice_layout,
    v_template.choice_marker
  )
  RETURNING id INTO v_new_id;
  
  -- 데이터 유형 항목 복사
  INSERT INTO question_type_items (question_type_id, data_type_id, role, order_index, config, required)
  SELECT v_new_id, data_type_id, role, order_index, config, required
  FROM question_type_items
  WHERE question_type_id = p_template_id;
  
  RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_output_type_from_template IS '템플릿에서 새 출력 유형을 생성하는 함수';

-- ============================================
-- 완료
-- ============================================

