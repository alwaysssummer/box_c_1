-- 문제 중복 방지를 위한 unique constraint 추가
-- passage_id + question_type_id 조합당 하나의 문제만 존재 가능

-- 1. 먼저 중복 데이터 정리 (각 조합에서 최신 것만 유지)
DELETE FROM generated_questions
WHERE id NOT IN (
  SELECT DISTINCT ON (passage_id, question_type_id) id
  FROM generated_questions
  ORDER BY passage_id, question_type_id, created_at DESC
);

-- 2. unique constraint 추가
ALTER TABLE generated_questions
ADD CONSTRAINT unique_passage_question_type 
UNIQUE (passage_id, question_type_id);

