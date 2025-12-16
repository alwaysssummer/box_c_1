-- 시스템 기본값 테이블
-- 출력 템플릿의 글로벌 기본값을 저장합니다.

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본값 삽입: 출력 템플릿 시스템 기본값
INSERT INTO system_settings (key, value, description)
VALUES (
  'template_defaults',
  '{
    "fontSize": 9,
    "lineHeight": 1.6,
    "padding": { "top": 15, "bottom": 15, "left": 15, "right": 15 },
    "columnGap": 24,
    "questionSpacing": 16,
    "choiceMarker": "circle",
    "breakMode": "protect-passage"
  }',
  '출력 템플릿 시스템 기본값'
)
ON CONFLICT (key) DO NOTHING;

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_settings_timestamp ON system_settings;

CREATE TRIGGER trigger_update_system_settings_timestamp
BEFORE UPDATE ON system_settings
FOR EACH ROW
EXECUTE FUNCTION update_system_settings_timestamp();















