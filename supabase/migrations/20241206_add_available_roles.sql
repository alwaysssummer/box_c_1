-- ============================================
-- 데이터 유형에 사용 가능 역할 추가
-- ============================================

-- available_roles: 이 데이터 유형이 문제에서 사용될 수 있는 역할들
-- 예: ['body', 'choices', 'answer', 'explanation']
ALTER TABLE data_types 
ADD COLUMN IF NOT EXISTS available_roles TEXT[] DEFAULT '{}';

-- 기존 데이터 유형에 기본값 설정 (예시)
-- 한국어 번역 계열: body, explanation에 적합
-- 어휘 계열: choices, answer에 적합
-- 이 부분은 관리자가 UI에서 직접 설정할 수 있음

COMMENT ON COLUMN data_types.available_roles IS '문제 생성 시 이 데이터가 사용될 수 있는 역할 (body, choices, answer, explanation)';

