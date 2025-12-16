-- block_definitions 테이블에 modifies_passage 컬럼 추가
-- 이 플래그가 true이면 AI가 출력한 passage/body를 사용
-- false(기본값)이면 항상 DB 원본 지문을 사용

ALTER TABLE block_definitions
ADD COLUMN IF NOT EXISTS modifies_passage BOOLEAN NOT NULL DEFAULT false;

-- 코멘트 추가
COMMENT ON COLUMN block_definitions.modifies_passage IS '지문 가공 여부. true면 AI 출력 사용, false면 DB 원본 사용';

