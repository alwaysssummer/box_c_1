# 🚀 새로운 출제 시스템 개발 플랜

> **목표**: 기존의 복잡한 출제 로직을 완전히 대체하는 심플하고 안정적인 블록 기반 시스템 구축

---

## 📋 기존 문제점 분석 및 해결 방안

| # | 기존 문제 | 원인 | 해결 방안 |
|---|-----------|------|-----------|
| 1 | frame_config 연결 끊어짐 | 별도 테이블, 조인 누락 | 문제 유형에 레이아웃 내장 |
| 2 | 문제 1개만 표시 | 중복 방지 로직, 데이터 구조 혼란 | 블록 기반 조합 |
| 3 | 블록 배치 안 됨 | position 렌더링 누락 | 레이아웃 + 블록 통합 정의 |
| 4 | 원큐/슬롯 구분 복잡 | 두 가지 로직 병존 | **모두 "블록"으로 통합** |
| 5 | 저장 후 확인 안 됨 | 분산된 테이블, 상태 추적 어려움 | 블록 중앙 관리 |
| 6 | 연결 복잡 | 바텀업 방식 (4단계) | **탑다운 방식** (2단계) |
| 7 | 데이터 재사용 안 됨 | 매번 새로 생성 | 블록 검증 → 재사용 |
| 8 | 레이아웃 반영 안 됨 | 설정과 렌더링 분리 | 문제 유형에 레이아웃 포함 |

---

## 🏗️ 새로운 아키텍처

### 핵심 원칙

```
1. 모든 데이터는 "블록(Block)"
2. 탑다운 정의: 문제 유형 → 필요 블록 → 프롬프트
3. 블록 중앙 관리 및 재사용
4. 출력 레이아웃 내장 (연결 끊어질 일 없음)
```

### 데이터 흐름

```
[문제 유형 정의]
    ↓
┌─────────────────────────────────────┐
│  required_blocks: ["요지", "주제"]   │
│  block_prompts: { "요지": "p1" }     │
│  layout: { left: [...], right: [...]} │
└─────────────────────────────────────┘
    ↓
[문제 생성 버튼 클릭]
    ↓
┌─────────────────────────────────────┐
│  1. 필요 블록 검증                   │
│  2. 기존 블록 있으면 → 재사용        │
│  3. 없으면 → 프롬프트 실행 → 블록 생성 │
│  4. 모든 블록 조합 → 문제 생성        │
└─────────────────────────────────────┘
    ↓
[출력 렌더링]
    ↓
┌─────────────────────────────────────┐
│  문제 유형의 layout 설정에 따라      │
│  블록들을 배치하여 렌더링            │
└─────────────────────────────────────┘
```

---

## 📊 새로운 데이터베이스 스키마

### 1. blocks 테이블 (신규)

```sql
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 위치 정보
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  sentence_index INTEGER NULL,  -- NULL이면 지문 단위, 숫자면 문장 단위
  
  -- 블록 식별
  label VARCHAR(100) NOT NULL,  -- 예: "요지", "주제", "제목", "단어장", "본문"
  unit VARCHAR(20) NOT NULL CHECK (unit IN ('passage', 'sentence')),
  
  -- 프롬프트 연결
  prompt_id UUID REFERENCES prompts(id),
  
  -- 콘텐츠
  content JSONB NOT NULL,  -- 블록의 실제 데이터
  
  -- 메타데이터
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT NULL,
  model_used VARCHAR(100) NULL,
  tokens_used INTEGER NULL,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 중복 방지 (같은 지문/문장에서 같은 라벨의 블록은 하나만)
  UNIQUE(passage_id, sentence_index, label)
);

-- 인덱스
CREATE INDEX idx_blocks_passage ON blocks(passage_id);
CREATE INDEX idx_blocks_label ON blocks(label);
CREATE INDEX idx_blocks_passage_label ON blocks(passage_id, label);
```

### 2. question_types 테이블 수정

```sql
-- 기존 컬럼 중 불필요한 것 제거하고 새 컬럼 추가
ALTER TABLE question_types
  -- 새 컬럼
  ADD COLUMN required_blocks JSONB DEFAULT '[]',  -- 필요한 블록 라벨 목록
  ADD COLUMN block_prompts JSONB DEFAULT '{}',    -- 블록별 프롬프트 매핑
  ADD COLUMN layout JSONB DEFAULT '{}',           -- 출력 레이아웃 설정
  ADD COLUMN unit VARCHAR(20) DEFAULT 'passage',  -- 'passage' 또는 'sentence'
  
  -- 기존 불필요 컬럼 제거 (선택적)
  DROP COLUMN IF EXISTS print_layout_id,
  DROP COLUMN IF EXISTS required_slots;
```

### 3. generated_questions 테이블 수정

```sql
ALTER TABLE generated_questions
  ADD COLUMN block_ids JSONB DEFAULT '[]',  -- 사용된 블록 ID 목록
  ADD COLUMN sentence_index INTEGER NULL;   -- 문장 단위일 경우
```

### 새 스키마 구조 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                        question_types                           │
├─────────────────────────────────────────────────────────────────┤
│ id, name, description                                           │
│ required_blocks: ["지문", "요지", "주제", "제목"]                │
│ block_prompts: {                                                │
│   "요지": "prompt_uuid_1",                                      │
│   "주제": "prompt_uuid_2",                                      │
│   "제목": "prompt_uuid_3"                                       │
│ }                                                               │
│ layout: {                                                       │
│   "columns": 2,                                                 │
│   "left": ["지문", "요지"],                                     │
│   "right": ["주제", "제목"]                                     │
│ }                                                               │
│ unit: "passage"                                                 │
└─────────────────────────────────────────────────────────────────┘
         ↓ 참조
┌─────────────────────────────────────────────────────────────────┐
│                           blocks                                │
├─────────────────────────────────────────────────────────────────┤
│ id, passage_id, sentence_index, label, unit, prompt_id          │
│ content: { ... 실제 데이터 ... }                                │
│ status, created_at                                              │
└─────────────────────────────────────────────────────────────────┘
         ↓ 조합
┌─────────────────────────────────────────────────────────────────┐
│                     generated_questions                         │
├─────────────────────────────────────────────────────────────────┤
│ id, passage_id, question_type_id, sentence_index                │
│ block_ids: ["block_1", "block_2", ...]                          │
│ instruction, body, choices, answer, explanation                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 구현 단계별 플랜

### Phase 0: 기존 코드 백업 및 정리

**목적**: 새 로직과 기존 로직의 충돌 방지

```
작업 내용:
1. 기존 출제 관련 API 백업
   - /api/generate-data → _backup/
   - /api/generate-question → _backup/
   - /api/generate-questions → _backup/
   - /api/generated-data → _backup/
   - /api/generated-questions → _backup/
   
2. 기존 출력 템플릿 관련 코드 백업
   - /api/output-templates → _backup/
   - /api/print-layouts → _backup/
   
3. 기존 컴포넌트 백업
   - components/features/generation → _backup/
   - components/print-system → _backup/
```

### Phase 1: 새 DB 스키마 설계

**목적**: 블록 중앙 관리 기반 마련

```sql
-- 마이그레이션 파일: supabase/migrations/xxx_new_block_system.sql

-- 1. blocks 테이블 생성
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passage_id UUID NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  sentence_index INTEGER NULL,
  label VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'passage',
  prompt_id UUID REFERENCES prompts(id),
  content JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  error_message TEXT NULL,
  model_used VARCHAR(100) NULL,
  tokens_used INTEGER NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(passage_id, sentence_index, label)
);

-- 2. question_types 확장
ALTER TABLE question_types
  ADD COLUMN IF NOT EXISTS required_blocks JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS block_prompts JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS layout JSONB DEFAULT '{"columns": 1}',
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'passage';

-- 3. generated_questions 확장
ALTER TABLE generated_questions
  ADD COLUMN IF NOT EXISTS block_ids JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS sentence_index INTEGER NULL;
```

### Phase 2: 블록 관리 API 구현

**목적**: 블록 CRUD 및 조회

```
새 API 엔드포인트:
├── /api/v2/blocks
│   ├── GET    - 블록 목록 조회 (passage_id, label 필터)
│   ├── POST   - 블록 생성 (프롬프트 실행)
│   └── DELETE - 블록 삭제
│
├── /api/v2/blocks/[id]
│   ├── GET    - 단일 블록 조회
│   ├── PATCH  - 블록 수정
│   └── DELETE - 블록 삭제
│
└── /api/v2/blocks/check
    └── POST   - 블록 존재 여부 확인 (재사용 체크)
```

### Phase 3: 문제 유형 재설계

**목적**: 탑다운 정의 구조 구현

```
수정할 컴포넌트:
├── components/features/question-type/
│   ├── QuestionTypeFormV2.tsx    (신규)
│   │   - required_blocks 설정
│   │   - block_prompts 매핑
│   │   - layout 시각적 편집기
│   │
│   └── BlockConfigEditor.tsx      (신규)
│       - 필요 블록 추가/제거
│       - 블록별 프롬프트 선택
│       - 레이아웃 미리보기
```

### Phase 4: 통합 문제 생성 로직

**목적**: 탑다운 방식 생성 로직

```
새 API:
/api/v2/generate
├── POST - 통합 문제 생성
│
│   요청 본문:
│   {
│     "passage_id": "...",
│     "question_type_id": "...",
│     "sentence_index": null  // 문장 단위일 경우 숫자
│   }
│
│   처리 로직:
│   1. question_type에서 required_blocks 가져오기
│   2. 각 블록별로:
│      a. blocks 테이블에서 존재 여부 확인
│      b. 있으면 → 재사용
│      c. 없으면 → block_prompts에서 프롬프트 가져와 실행 → 저장
│   3. 모든 블록 조합
│   4. generated_questions에 저장
│   5. 결과 반환
```

**핵심 로직 의사 코드:**

```typescript
async function generateQuestion(passageId: string, questionTypeId: string, sentenceIndex?: number) {
  // 1. 문제 유형 정보 가져오기
  const questionType = await getQuestionType(questionTypeId)
  const { required_blocks, block_prompts, layout } = questionType
  
  // 2. 필요한 블록들 수집
  const blocks: Block[] = []
  
  for (const blockLabel of required_blocks) {
    // 2a. 기존 블록 확인
    let block = await findBlock({
      passageId,
      sentenceIndex,
      label: blockLabel
    })
    
    // 2b. 없으면 생성
    if (!block) {
      const promptId = block_prompts[blockLabel]
      if (promptId) {
        block = await generateBlock({
          passageId,
          sentenceIndex,
          label: blockLabel,
          promptId
        })
      } else {
        // 프롬프트 없는 블록 (예: "지문" - 원본 데이터)
        block = await createPassageBlock(passageId, blockLabel)
      }
    }
    
    blocks.push(block)
  }
  
  // 3. 블록들 조합하여 문제 생성
  const question = composeQuestion(blocks, layout)
  
  // 4. 저장
  const saved = await saveGeneratedQuestion({
    passage_id: passageId,
    question_type_id: questionTypeId,
    sentence_index: sentenceIndex,
    block_ids: blocks.map(b => b.id),
    ...question
  })
  
  return saved
}
```

### Phase 5: 출력 레이아웃 엔진 통합

**목적**: 레이아웃 설정을 렌더링에 직접 연결

```
수정할 컴포넌트:
├── components/print-system-v2/
│   ├── PrintDocumentV2.tsx    - 새로운 문서 렌더러
│   ├── BlockRenderer.tsx      - 블록 타입별 렌더러
│   ├── LayoutEngine.tsx       - 레이아웃 계산기
│   └── PageRenderer.tsx       - 페이지 렌더러
```

**레이아웃 설정 구조:**

```typescript
interface LayoutConfig {
  columns: 1 | 2
  left?: string[]   // 좌측 블록 라벨들
  right?: string[]  // 우측 블록 라벨들
  style?: {
    fontSize: number
    lineHeight: number
    columnGap: number
  }
}
```

### Phase 6: UI 연동

**목적**: 관리자/강사 페이지 연동

```
수정할 파일:
├── app/page.tsx           - 관리자 페이지
│   - 문제 유형 설정 UI 업데이트
│   - 블록 관리 UI 추가
│
├── app/teacher/page.tsx   - 강사 페이지
│   - 새 생성 로직 연동
│   - 새 렌더링 시스템 연동
│
└── components/features/
    ├── question-type/QuestionTypeFormV2.tsx
    └── generation/GenerationPanelV2.tsx
```

### Phase 7: 테스트 및 마이그레이션

**목적**: 안정성 검증 및 기존 데이터 마이그레이션

```
1. 단위 테스트
   - 블록 생성/조회/삭제
   - 문제 생성 로직
   - 레이아웃 렌더링

2. 통합 테스트
   - 전체 플로우 테스트
   - 다양한 문제 유형 테스트

3. 기존 데이터 마이그레이션 (선택적)
   - generated_data → blocks
   - generated_questions 업데이트
```

---

## 📁 최종 파일 구조

```
src/
├── app/
│   ├── api/
│   │   ├── v2/                          # 새 API (버전 분리)
│   │   │   ├── blocks/
│   │   │   │   ├── route.ts             # GET, POST
│   │   │   │   ├── [id]/route.ts        # GET, PATCH, DELETE
│   │   │   │   └── check/route.ts       # POST (존재 확인)
│   │   │   │
│   │   │   ├── generate/
│   │   │   │   └── route.ts             # POST (통합 생성)
│   │   │   │
│   │   │   └── question-types/
│   │   │       └── route.ts             # CRUD (새 스키마)
│   │   │
│   │   └── _backup/                     # 기존 API 백업
│   │
│   ├── page.tsx                         # 관리자 페이지
│   └── teacher/page.tsx                 # 강사 페이지
│
├── components/
│   ├── features/
│   │   ├── question-type/
│   │   │   ├── QuestionTypeFormV2.tsx   # 새 문제 유형 폼
│   │   │   └── BlockConfigEditor.tsx    # 블록 설정 에디터
│   │   │
│   │   └── generation/
│   │       └── GenerationPanelV2.tsx    # 새 생성 패널
│   │
│   └── print-system-v2/                 # 새 출력 시스템
│       ├── index.ts
│       ├── PrintDocumentV2.tsx
│       ├── BlockRenderer.tsx
│       ├── LayoutEngine.tsx
│       └── PageRenderer.tsx
│
├── lib/
│   ├── block-system/                    # 블록 시스템 유틸리티
│   │   ├── index.ts
│   │   ├── types.ts                     # 블록 타입 정의
│   │   ├── generator.ts                 # 블록 생성 로직
│   │   └── composer.ts                  # 문제 조합 로직
│   │
│   └── layout-engine/                   # 레이아웃 엔진
│       ├── index.ts
│       ├── types.ts
│       └── calculator.ts
│
└── types/
    └── database.ts                      # DB 타입 정의 (업데이트)
```

---

## ✅ 검증 체크리스트

### 기존 문제 해결 확인

- [ ] frame_config 연결 끊어짐 → 문제 유형에 layout 내장
- [ ] 문제 1개만 표시 → 블록 조합으로 다중 문제 지원
- [ ] 블록 배치 안 됨 → layout 설정 직접 렌더링 적용
- [ ] 원큐/슬롯 구분 복잡 → 모두 "블록"으로 통합
- [ ] 저장 후 확인 안 됨 → 블록 중앙 관리로 상태 명확
- [ ] 연결 복잡 → 탑다운 방식으로 2단계 축소
- [ ] 데이터 재사용 안 됨 → 블록 검증 후 재사용
- [ ] 레이아웃 반영 안 됨 → 문제 유형에 레이아웃 포함

### 새 기능 검증

- [ ] 지문 단위 블록 생성/조회/재사용
- [ ] 문장 단위 블록 생성/조회/재사용
- [ ] 탑다운 문제 생성 (블록 검증 → 생성 → 조합)
- [ ] 레이아웃 설정 UI → 렌더링 반영
- [ ] 2단 레이아웃 정상 렌더링
- [ ] 여러 문제 동시 출력 (요지+주제+제목)

---

## 🚀 실행 순서

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
   ↓         ↓         ↓         ↓         ↓         ↓         ↓         ↓
  백업     스키마    블록API   유형재설계  생성로직  레이아웃   UI연동    테스트
```

**예상 소요 시간**: 각 Phase 1-2시간, 총 10-16시간

---

## 📝 참고: 블록 라벨 예시

```typescript
// 지문 단위 블록 라벨
const PASSAGE_BLOCK_LABELS = [
  '지문',      // 원본 지문
  '요지',      // 요지 문제
  '주제',      // 주제 문제
  '제목',      // 제목 문제
  '빈칸',      // 빈칸 문제
  '순서',      // 순서 문제
  '삽입',      // 삽입 문제
  '해설',      // 해설
]

// 문장 단위 블록 라벨
const SENTENCE_BLOCK_LABELS = [
  '문장',      // 원본 문장
  '단어장',    // 단어 목록
  '구문분석',  // 구문 분석 결과
  '문법설명',  // 문법 설명
  '빈칸',      // 문장 빈칸
]
```

---

**문서 작성일**: 2024-12-10
**버전**: 1.0

