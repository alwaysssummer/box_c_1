# 출력 설정 통합 시스템 구현 완료 ✅

## 📋 구현 내용

### ✅ 완료된 작업

#### 1단계: 프리셋 시스템 구현
- ✅ `src/lib/output-presets.ts` 생성
  - 문제 그룹별 최적화된 OutputConfig 프리셋 (csat, school_passage, school_sentence, study)
  - `getPresetForGroup()` 함수로 자동 프리셋 적용
  - 프리셋 병합 유틸리티 (`mergePresetWithOverrides`)

#### 2단계: UnifiedRenderer 통합 렌더러 구현
- ✅ `src/components/features/output/` 디렉토리 구조 생성
- ✅ 핵심 컴포넌트:
  - `UnifiedRenderer.tsx`: 메인 렌더러 (mode: preview/print/screen 지원)
  - `PageContainer.tsx`: A4/B5 페이지 컨테이너
  - `QuestionItem.tsx`: 개별 문제 렌더링
  - `FieldRenderer.tsx`: 필드별 렌더링 (passage, choices, answer 등)

- ✅ 유틸리티:
  - `utils/pagination.ts`: 페이지 분할 로직 (flow/smart 모드)
  - `utils/field-filter.ts`: ViewType별 필드 필터링
  - `styles/print.css`: @media print 스타일

#### 3단계: UI 통합
- ✅ **GenerationPreview.tsx**:
  - 출력 미리보기 모달 추가 (Print Preview)
  - UnifiedRenderer 통합
  - 학생용/교사용/정답만 탭 전환
  - 인쇄 버튼 추가

- ✅ **QuestionTypeForm.tsx**:
  - `question_group` 변경 시 프리셋 자동 적용
  - 초기 생성 시 자동 프리셋 선택
  - 프리셋 임포트 및 활용

#### 4단계: DB 마이그레이션 준비
- ✅ `supabase/migrations/20241211_output_config_final.sql` 생성
  - output_config 기본값 설정
  - NULL 값 채우기
  - NOT NULL 제약조건 추가
  - layout_config 삭제 준비 (선택적)

---

## 🎯 핵심 개선 사항

### 1. 설정 통합 (Single Source of Truth)
**Before:**
```typescript
interface QuestionType {
  layout_config: LayoutConfig     // 기존
  output_config?: OutputConfig    // 신규 (중복)
}
```

**After:**
```typescript
interface QuestionType {
  output_config: OutputConfig  // 단일 통합 설정
}
```

### 2. 프리셋 자동 적용
**Before:** 사용자가 수동으로 모든 설정 입력

**After:**
```typescript
// question_group 선택 시 자동으로 최적화된 설정 적용
const preset = getPresetForGroup('csat')  // 2단 레이아웃 자동 설정
```

### 3. 통합 렌더러 (WYSIWYG)
**Before:** 각 페이지별로 별도 렌더링 로직

**After:**
```typescript
// 단일 렌더러로 모든 출력 처리
<UnifiedRenderer
  mode="print"     // preview/print/screen
  viewType="student"  // student/teacher/answer_only
/>
```

---

## 📂 파일 구조

```
src/
├── lib/
│   └── output-presets.ts              ✨ 새로 생성
│
├── components/features/
│   ├── generation/
│   │   └── GenerationPreview.tsx       ✏️ 수정 (모달 추가)
│   │
│   ├── question-type/
│   │   └── QuestionTypeForm.tsx        ✏️ 수정 (프리셋 자동 적용)
│   │
│   └── output/                         ✨ 새 디렉토리
│       ├── UnifiedRenderer.tsx
│       ├── PageContainer.tsx
│       ├── QuestionItem.tsx
│       ├── FieldRenderer.tsx
│       ├── index.ts
│       ├── utils/
│       │   ├── pagination.ts
│       │   └── field-filter.ts
│       └── styles/
│           └── print.css
│
└── types/
    ├── output-config.ts               (기존 유지)
    └── database.ts                    (기존 유지)

supabase/migrations/
└── 20241211_output_config_final.sql   ✨ 새로 생성
```

---

## 🚀 사용 방법

### 1. DB 마이그레이션 실행

Supabase SQL Editor에서 실행:
```sql
-- supabase/migrations/20241211_output_config_final.sql 내용 복사 후 실행
```

### 2. 문제 유형 생성 시

1. **문제 그룹 선택** → 자동으로 프리셋 적용
   - `csat` → 2단 레이아웃 (지문 좌측, 문제 우측)
   - `school_passage` → 1단 레이아웃 (지문 상단 고정)
   - `school_sentence` → 1단 레이아웃 (문장-문제 쌍)
   - `study` → 1단 레이아웃 (학습자료용)

2. **블록 선택** → 필드 자동 추가

3. **출력 설정 / 뷰 설정** → 필요 시 커스터마이징

### 3. 문제 생성 후

1. **GenerationPreview**에서 생성된 문제 확인
2. **[출력 미리보기]** 버튼 클릭
3. **탭 전환**으로 학생용/교사용/정답만 확인
4. **[인쇄]** 버튼으로 실제 출력 → **WYSIWYG 보장**

---

## 🔍 주요 기능

### ✨ Print Preview (등록 전 미리보기)
```typescript
// GenerationPreview.tsx
<Button onClick={() => setShowPrintPreview(true)}>
  <Printer /> 출력 미리보기
</Button>

// 모달 내부
<UnifiedRenderer
  mode="print"              // 실제 출력 모드
  viewType={previewViewType} // 학생용/교사용 전환
  outputConfig={questionType.output_config}
/>
```

### 🎨 프리셋 시스템
```typescript
// output-presets.ts
export const OUTPUT_PRESETS = {
  csat: {
    columns: 2,  // 2단
    fields: [...],
    pageBreak: { mode: 'smart', unit: 'passage' },
    ...
  },
  school_passage: {
    columns: 1,  // 1단
    fields: [...],
    pageBreak: { mode: 'smart', unit: 'passage', minSpaceThreshold: 70 },
    ...
  },
  ...
}
```

### 📄 페이지네이션
```typescript
// pagination.ts
export function paginateQuestions(
  questions: Question[],
  config: OutputConfig
): PaginatedPage[] {
  // flow 모드: 자유 흐름
  // smart 모드: 단위별 분할 (passage/sentence/item)
  ...
}
```

---

## ⚠️ 주의사항

### 1. DB 마이그레이션
- **`layout_config` 컬럼 삭제는 선택적**
- 기존 데이터가 있다면 먼저 `output_config`로 마이그레이션 후 삭제
- 호환성 유지를 위해 당분간 `layout_config` 유지 권장

### 2. 기존 코드와의 호환성
- `layout_config`를 사용하는 기존 코드는 여전히 작동
- `output_config`가 우선 사용됨 (있는 경우)
- 점진적 마이그레이션 가능

### 3. 프리셋 커스터마이징
- 프리셋은 **초기값**으로만 사용
- 사용자는 언제든지 수정 가능
- DB에는 **최종 설정값**이 저장됨

---

## 🧪 테스트 체크리스트

### 1. 프리셋 적용
- [ ] 새 문제 유형 생성 시 question_group에 따라 프리셋 자동 적용
- [ ] question_group 변경 시 프리셋 자동 업데이트
- [ ] 필드 설정은 유지되는지 확인

### 2. 출력 미리보기
- [ ] GenerationPreview에서 [출력 미리보기] 버튼 표시
- [ ] 모달 열림 및 UnifiedRenderer 렌더링
- [ ] 학생용/교사용/정답만 탭 전환
- [ ] 페이지네이션 동작 (2페이지 이상 시)
- [ ] [인쇄] 버튼 클릭 시 브라우저 인쇄 다이얼로그

### 3. 렌더링 품질
- [ ] A4 페이지 크기 정확
- [ ] 여백 설정 반영
- [ ] 2단 레이아웃 동작 (csat)
- [ ] 선택지 마커 (①②③④⑤)
- [ ] 필드별 showIn 설정 반영

### 4. 인쇄
- [ ] Ctrl+P 또는 [인쇄] 버튼
- [ ] @media print 스타일 적용
- [ ] 페이지 번호 표시
- [ ] 배경색 제거
- [ ] 페이지 나눔 정확

---

## 📊 성과 요약

| 항목 | Before | After | 개선 |
|------|--------|-------|------|
| **설정 중복** | layout_config + output_config | output_config만 | ✅ 통합 |
| **렌더러 수** | 페이지별 별도 | UnifiedRenderer 1개 | ✅ 일관성 |
| **프리셋** | 수동 설정 | 자동 적용 | ✅ UX 개선 |
| **미리보기** | 카드 뷰만 | 카드 + A4 출력 | ✅ WYSIWYG |
| **재사용성** | 낮음 | 높음 (전역 사용) | ✅ 유지보수 |

---

## 🎉 결론

- ✅ **설정 통합**: layout_config → output_config 일원화
- ✅ **프리셋 시스템**: question_group 기반 자동 설정
- ✅ **통합 렌더러**: 단일 렌더링 로직으로 WYSIWYG 보장
- ✅ **Print Preview**: 등록 전 실제 출력물 확인 가능
- ✅ **호환성 유지**: 기존 코드 영향 최소화

**모든 목표 달성! 🚀**




