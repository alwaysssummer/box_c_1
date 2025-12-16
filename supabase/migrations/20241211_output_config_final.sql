-- ============================================
-- 출력 설정 통합 마이그레이션
-- ============================================
-- 
-- 목적: layout_config를 폐기하고 output_config로 통합
-- 실행 전: question_types 테이블 백업 권장
--

-- 1. output_config 컬럼의 기본값 설정
ALTER TABLE question_types 
ALTER COLUMN output_config SET DEFAULT '{
  "version": "2.0",
  "columns": 1,
  "fields": [
    {"key": "passage", "label": "지문"},
    {"key": "question", "label": "문제"},
    {"key": "choices", "label": "선택지"},
    {"key": "answer", "label": "정답", "showIn": ["student_answer", "teacher", "answer_only"]},
    {"key": "explanation", "label": "해설", "showIn": ["teacher"]}
  ],
  "paper": {"size": "A4", "orientation": "portrait", "margins": {"top": 15, "bottom": 15, "left": 15, "right": 15}},
  "typography": {"baseFontSize": 11, "lineHeight": 1.5, "minFontSize": 8},
  "pageBreak": {"mode": "smart", "unit": "passage", "minSpaceThreshold": 50, "avoidOrphans": true},
  "options": {"pageNumbers": true, "pageNumberPosition": "bottom-center", "pageNumberFormat": "number", "choiceMarker": "circled", "choiceLayout": "vertical"}
}'::jsonb;

-- 2. NULL 값을 기본값으로 채우기
UPDATE question_types 
SET output_config = DEFAULT 
WHERE output_config IS NULL;

-- 3. output_config를 NOT NULL로 변경
ALTER TABLE question_types 
ALTER COLUMN output_config SET NOT NULL;

-- 4. layout_config 컬럼 삭제 (선택적 - 데이터 마이그레이션 완료 후 실행)
-- ⚠️ 주의: 아래 줄의 주석을 해제하여 실행하면 layout_config가 영구 삭제됩니다
-- ALTER TABLE question_types DROP COLUMN IF EXISTS layout_config;

-- 5. 코멘트 업데이트
COMMENT ON COLUMN question_types.output_config IS '
출력 설정 v2.0 (통합)
- 이전 layout_config의 모든 기능을 포함
- 프리셋 기반 자동 설정 지원
- 페이지 분할, 타이포그래피, 필드 순서 등 통합 관리
';

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 출력 설정 통합 마이그레이션 완료';
  RAISE NOTICE '⚠️  layout_config 컬럼은 아직 유지됩니다 (호환성 유지)';
  RAISE NOTICE '💡 완전히 제거하려면 위 SQL의 4번 주석을 해제하세요';
END $$;




