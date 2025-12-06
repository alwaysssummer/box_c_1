-- ============================================
-- 기본 데이터 유형 시드 데이터
-- 날짜: 2024-12-05
-- 설명: 문장 분리 시 자동 생성되는 기본 데이터 유형 4종
-- ============================================

-- 기존 기본 데이터 유형이 있으면 삭제 후 재생성
DELETE FROM data_types WHERE id LIKE 'base-%';

-- 기본 데이터 유형 삽입
INSERT INTO data_types (
  id, 
  name, 
  target, 
  category, 
  prompt_id, 
  prompt,
  output_schema,
  has_answer,
  has_dependency,
  difficulty,
  recommended_model,
  config
) VALUES 
-- 1. 영어지문: 지문 전체 영어 원문
(
  'base-0001-passage-english',
  '영어지문',
  'passage',
  'base',
  NULL,  -- AI 호출 없음
  NULL,
  NULL,
  false,
  false,
  'simple',
  'none',  -- 모델 불필요
  '{
    "source": {
      "table": "passages",
      "column": "content",
      "aggregate": false
    },
    "description": "지문 전체 영어 원문",
    "icon": "📄",
    "noAiRequired": true
  }'::jsonb
),

-- 2. 한글해석: 문장별 번역을 합친 전체 해석
(
  'base-0002-passage-korean',
  '한글해석',
  'passage',
  'base',
  NULL,
  NULL,
  NULL,
  false,
  false,
  'simple',
  'none',
  '{
    "source": {
      "table": "sentences",
      "column": "korean_translation",
      "aggregate": true
    },
    "description": "문장별 번역을 합친 전체 한글 해석",
    "icon": "🇰🇷",
    "noAiRequired": true
  }'::jsonb
),

-- 3. 영어한줄: 문장별 영어 원문
(
  'base-0003-sentence-english',
  '영어한줄',
  'sentence',
  'base',
  NULL,
  NULL,
  NULL,
  false,
  false,
  'simple',
  'none',
  '{
    "source": {
      "table": "sentences",
      "column": "content",
      "aggregate": false
    },
    "description": "문장별 영어 원문",
    "icon": "🔤",
    "noAiRequired": true
  }'::jsonb
),

-- 4. 한글한줄: 문장별 한글 번역
(
  'base-0004-sentence-korean',
  '한글한줄',
  'sentence',
  'base',
  NULL,
  NULL,
  NULL,
  false,
  false,
  'simple',
  'none',
  '{
    "source": {
      "table": "sentences",
      "column": "korean_translation",
      "aggregate": false
    },
    "description": "문장별 한글 번역",
    "icon": "🇰🇷",
    "noAiRequired": true
  }'::jsonb
);

-- 확인
SELECT id, name, target, category, config->>'description' as description 
FROM data_types 
WHERE category = 'base'
ORDER BY id;

