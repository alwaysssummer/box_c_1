-- 문제 유형의 표시용 그룹 관리를 위한 컬럼 추가
-- 강사 페이지에서 유형을 그룹별로 표시하기 위한 용도

-- display_group: 표시 그룹명 (실전, 어휘, 문법 등)
-- display_order: 그룹 내 표시 순서

ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS display_group TEXT DEFAULT '기타';

ALTER TABLE question_types
ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- 기존 데이터 기본 그룹 설정
UPDATE question_types 
SET display_group = '실전' 
WHERE purpose = 'practical' OR name IN ('주제', '제목', '요지', '빈칸1', '빈칸추론');

UPDATE question_types 
SET display_group = '어휘' 
WHERE name LIKE '%어휘%';

UPDATE question_types 
SET display_group = '문법' 
WHERE name LIKE '%문법%';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_question_types_display_group ON question_types(display_group);

