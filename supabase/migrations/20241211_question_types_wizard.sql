-- ============================================
-- 문제 유형 4단계 위자드 시스템 - 마이그레이션
-- 파일: 20241211_question_types_wizard.sql
-- ============================================

-- 1. question_types 테이블 확장
-- output_type: 문제형/자습서형 구분
ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS output_type TEXT DEFAULT 'question' 
  CHECK (output_type IN ('question', 'study_material'));

-- description 컬럼 (이미 없으면 추가)
ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS description TEXT;

-- question_group 컬럼 (분류용)
ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS question_group TEXT DEFAULT 'csat'
  CHECK (question_group IN ('csat', 'school_passage', 'school_sentence', 'study'));

-- 2. layout_config 기본값 업데이트
-- 기존 layout_config가 비어있는 경우 기본값 설정
UPDATE question_types
SET layout_config = jsonb_build_object(
  'placement_mode', 'free_flow',
  'columns', 1,
  'choice_layout', 'vertical',
  'choice_marker', 'number_circle',
  'views', jsonb_build_object(
    'student', ARRAY['passage', 'choices'],
    'answer', ARRAY['choices', 'answer'],
    'teacher', ARRAY['passage', 'choices', 'answer', 'explanation']
  )
)
WHERE layout_config IS NULL OR layout_config = '{}'::jsonb;

-- 3. 코멘트 추가
COMMENT ON COLUMN question_types.output_type IS '출력 유형: question(문제형), study_material(자습서형)';
COMMENT ON COLUMN question_types.question_group IS '문제 그룹: csat(수능형), school_passage(내신-지문), school_sentence(내신-문장), study(자습서)';
COMMENT ON COLUMN question_types.layout_config IS '레이아웃 설정: placement_mode, columns, questions_per_page, choice_layout, choice_marker, views';
COMMENT ON COLUMN question_types.required_block_ids IS '필요한 블록 정의 ID 목록 (보통 1개)';

-- 4. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_question_types_output_type ON question_types(output_type);
CREATE INDEX IF NOT EXISTS idx_question_types_question_group ON question_types(question_group);

-- ============================================
-- 완료!
-- ============================================

