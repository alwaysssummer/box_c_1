-- ============================================
-- 출제 2단계 시스템 - 슬롯 시스템 DB 스키마
-- 생성일: 2024-12-06
-- ============================================

-- ============================================
-- 1. data_types 테이블 확장
-- ============================================

-- output_slots: 이 데이터 유형이 생성하는 슬롯명 목록
ALTER TABLE data_types 
ADD COLUMN IF NOT EXISTS output_slots TEXT[] DEFAULT '{}';

COMMENT ON COLUMN data_types.output_slots IS 
  '이 데이터 유형이 생성하는 슬롯명 목록 (예: original, translation, vocabulary)';

-- ============================================
-- 2. question_types 테이블 확장
-- ============================================

-- required_slots: 이 문제 유형이 필요로 하는 슬롯명 목록
ALTER TABLE question_types 
ADD COLUMN IF NOT EXISTS required_slots TEXT[] DEFAULT '{}';

COMMENT ON COLUMN question_types.required_slots IS 
  '이 문제 유형이 필요로 하는 슬롯명 목록';

-- question_group: 문제 유형 그룹 (practical, selection, writing, analysis, vocabulary)
ALTER TABLE question_types 
ADD COLUMN IF NOT EXISTS question_group TEXT DEFAULT 'practical';

COMMENT ON COLUMN question_types.question_group IS 
  '문제 유형 그룹: practical(실전형), selection(선택/수정형), writing(서술형), analysis(분석형), vocabulary(단어장)';

-- ============================================
-- 3. generated_data 테이블 확장
-- ============================================

-- slot_data: 슬롯명별 파싱된 데이터 (JSON)
ALTER TABLE generated_data 
ADD COLUMN IF NOT EXISTS slot_data JSONB DEFAULT '{}';

COMMENT ON COLUMN generated_data.slot_data IS 
  '슬롯명별 파싱된 데이터 (예: {"original": "...", "translation": "...", "vocabulary": [...]})';

-- ============================================
-- 4. 인덱스 추가
-- ============================================

-- output_slots 배열 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_data_types_output_slots 
ON data_types USING GIN (output_slots);

-- required_slots 배열 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_question_types_required_slots 
ON question_types USING GIN (required_slots);

-- question_group 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_question_types_question_group 
ON question_types (question_group);

-- slot_data JSON 검색용 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_generated_data_slot_data 
ON generated_data USING GIN (slot_data);

-- ============================================
-- 5. 뷰: 지문별 슬롯 데이터 현황
-- ============================================

CREATE OR REPLACE VIEW passage_slot_status AS
SELECT 
  p.id AS passage_id,
  p.name AS passage_name,
  u.name AS unit_name,
  t.name AS textbook_name,
  COALESCE(
    (SELECT jsonb_object_agg(dt.name, gd.slot_data)
     FROM generated_data gd
     JOIN data_types dt ON dt.id = gd.data_type_id
     WHERE gd.passage_id = p.id
       AND gd.status = 'completed'
       AND gd.slot_data IS NOT NULL
       AND gd.slot_data != '{}'::jsonb
    ), '{}'::jsonb
  ) AS available_slots,
  (SELECT array_agg(DISTINCT key)
   FROM generated_data gd,
        jsonb_object_keys(gd.slot_data) AS key
   WHERE gd.passage_id = p.id
     AND gd.status = 'completed'
  ) AS slot_names
FROM passages p
JOIN units u ON u.id = p.unit_id
JOIN textbooks t ON t.id = u.textbook_id;

COMMENT ON VIEW passage_slot_status IS 
  '지문별로 사용 가능한 슬롯 데이터 현황을 보여주는 뷰';

-- ============================================
-- 6. 함수: 지문의 슬롯 데이터 조회
-- ============================================

CREATE OR REPLACE FUNCTION get_passage_slot_data(p_passage_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  slot_record RECORD;
BEGIN
  -- 해당 지문의 모든 완료된 생성 데이터에서 slot_data 병합
  FOR slot_record IN
    SELECT gd.slot_data
    FROM generated_data gd
    WHERE gd.passage_id = p_passage_id
      AND gd.status = 'completed'
      AND gd.slot_data IS NOT NULL
      AND gd.slot_data != '{}'::jsonb
  LOOP
    result := result || slot_record.slot_data;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_passage_slot_data IS 
  '지문 ID로 해당 지문의 모든 슬롯 데이터를 병합하여 반환';

-- ============================================
-- 7. 함수: 문제 유형별 필요 슬롯 검증
-- ============================================

CREATE OR REPLACE FUNCTION validate_slots_for_question_type(
  p_passage_id UUID,
  p_question_type_id UUID
)
RETURNS TABLE (
  slot_name TEXT,
  is_available BOOLEAN,
  slot_value JSONB
) AS $$
DECLARE
  required_slots_arr TEXT[];
  available_data JSONB;
BEGIN
  -- 문제 유형의 필요 슬롯 가져오기
  SELECT qt.required_slots INTO required_slots_arr
  FROM question_types qt
  WHERE qt.id = p_question_type_id;
  
  -- 지문의 사용 가능한 슬롯 데이터 가져오기
  SELECT get_passage_slot_data(p_passage_id) INTO available_data;
  
  -- 각 슬롯별 가용 여부 반환
  RETURN QUERY
  SELECT 
    slot AS slot_name,
    (available_data ? slot) AS is_available,
    CASE 
      WHEN available_data ? slot THEN available_data->slot
      ELSE NULL
    END AS slot_value
  FROM unnest(required_slots_arr) AS slot;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_slots_for_question_type IS 
  '특정 지문이 문제 유형에 필요한 슬롯 데이터를 모두 가지고 있는지 검증';



