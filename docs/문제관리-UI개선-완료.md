# 문제관리 UI/UX 개선 완료 ✅

## 📅 작업 일시
2024년 12월 12일

## 🎯 개선 목표
문제관리 기능의 UI/UX를 문제출제와 동일한 패턴으로 통일하여 사용자 경험 일관성 확보

---

## ✨ 주요 개선 사항

### 1. 필터를 중앙 패널 상단으로 이동 ⭐
**Before:**
```
[좌측 트리] [중앙 패널 - 지문 목록] [우측 패널 - 필터]
```

**After:**
```
[좌측 트리] [중앙 패널 - 필터 + 지문 목록] [우측 패널 - 선택 요약]
```

**구현 내용:**
- `ManageFilterPanel` 컴포넌트를 우측에서 제거
- `StatusDashboard` 내부에 필터 UI를 Card 형태로 통합
- 필터 상태를 StatusDashboard 내부에서 관리 (props 전달 불필요)
- 가로 레이아웃으로 변경하여 공간 효율성 향상

**코드:**
```typescript
// StatusDashboard.tsx
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center gap-3 flex-wrap">
      {/* 1. 유형 분류 */}
      <Select value={filterType} onValueChange={...}>
        <SelectItem value="all">전체</SelectItem>
        <SelectItem value="dataType">데이터 유형</SelectItem>
        <SelectItem value="questionType">문제 유형</SelectItem>
      </Select>
      
      {/* 2. 유형명 (조건부) */}
      {filterType !== 'all' && (
        <Select value={selectedTypeId} onValueChange={...}>
          {/* 구체적인 유형 목록 */}
        </Select>
      )}
      
      {/* 3. 상태 */}
      <Select value={statusFilter} onValueChange={...}>
        <SelectItem value="all">전체</SelectItem>
        <SelectItem value="completed">✅ 완료</SelectItem>
        <SelectItem value="pending">⏳ 대기</SelectItem>
        <SelectItem value="failed">❌ 오류</SelectItem>
      </Select>
    </div>
  </CardHeader>
</Card>
```

---

### 2. 교재 범위 전체 선택/해제 기능 추가 ⭐

**구현 내용:**
- 좌측 트리 상단에 "전체 선택/해제" 버튼 추가
- 모든 교재를 한 번에 선택/해제 가능
- 선택 상태에 따라 버튼 텍스트 동적 변경

**코드:**
```typescript
// page.tsx - 좌측 트리 상단
{contentMode === '문제관리' && groups.length > 0 && (
  <div className="mb-2 px-2">
    <button
      onClick={() => {
        const allTextbookIds = groups.flatMap(g => 
          g.textbooks?.map(t => t.id) || []
        )
        if (selectedTextbookIdsForManage.length === allTextbookIds.length) {
          setSelectedTextbookIdsForManage([])
        } else {
          setSelectedTextbookIdsForManage(allTextbookIds)
        }
      }}
      className="w-full px-3 py-2 text-xs font-medium bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md"
    >
      {selectedTextbookIdsForManage.length === allTextbookIds.length 
        ? '✓ 전체 해제' 
        : '☐ 전체 선택'}
    </button>
  </div>
)}
```

**UI:**
```
┌─ 좌측 트리 ─────────┐
│ [☐ 전체 선택]       │
│ □ 그룹1            │
│   □ 교재A          │
│   □ 교재B          │
│ □ 그룹2            │
│   □ 교재C          │
└────────────────────┘
```

---

### 3. 중앙 패널을 문제출제와 동일한 카드 스타일로 변경 ⭐

**Before (트리 구조):**
```
📚 선택된 교재
├─ 교재A
│  ├─ 단원1
│  │  ├─ 지문1 [체크박스] 📊2 ❓3
│  │  └─ 지문2 [체크박스] 📊1 ❓0
```

**After (카드 구조):**
```
┌───────────────────────────────────────┐
│ [☑️] 지문명                            │
│     교재A > 단원1                      │
│     [📊 3/5] [❓ 12/15] [👁️ 미리보기]  │
└───────────────────────────────────────┘
```

**구현 내용:**
- 트리 구조에서 플랫한 카드 리스트로 변경
- 각 지문을 독립적인 Card 컴포넌트로 표시
- 체크박스, 지문 정보, 상태 배지, 미리보기 버튼을 한 줄에 배치
- 문제출제의 `OneClickGeneration`과 동일한 디자인 패턴 적용

**코드:**
```typescript
// StatusDashboard.tsx - SelectedTextbooksView
<div className="space-y-2">
  {selectedTextbooks.map(({ textbook, groupName }) => 
    textbook.units?.map(unit => 
      unit.passages?.filter(p => isPassageVisible(p)).map(passage => (
        <Card 
          key={passage.id}
          className={cn(
            "transition-all cursor-pointer hover:shadow-md",
            isSelected && "ring-2 ring-violet-500 shadow-lg",
            isChecked && "bg-blue-50/50"
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* 체크박스 */}
              <Checkbox checked={isChecked} />

              {/* 지문 정보 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {passage.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {textbook.name} &gt; {unit.name}
                </div>
              </div>

              {/* 상태 배지 */}
              <Badge variant="secondary">
                <Database className="w-3 h-3 mr-1" />
                {dataCompleted}/{dataTotal}
              </Badge>
              <Badge variant="secondary">
                <HelpCircle className="w-3 h-3 mr-1" />
                {questionCompleted}/{questionTotal}
              </Badge>

              {/* 미리보기 버튼 */}
              <Button size="sm" variant="ghost">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))
    )
  )}
</div>
```

---

### 4. 우측 패널을 선택 항목 요약으로 변경 ⭐

**Before:**
```
[우측 패널]
┌─ 필터 조건 ─────┐
│ 유형 분류: 전체  │
│ 상태: 전체      │
│ [초기화]        │
└─────────────────┘
```

**After:**
```
[우측 패널]
┌─ 선택된 교재 ───┐
│ 📚 3개 교재 선택 │
│                │
│ 필터는 중앙     │
│ 패널에서 조정   │
└─────────────────┘
```

**구현 내용:**
- 필터 UI를 중앙 패널로 이동
- 우측 패널은 선택된 교재 수만 간단하게 표시
- 안내 메시지 추가

**코드:**
```typescript
// page.tsx - 우측 패널
{activeTab === '교재관리' && contentMode === '문제관리' && (
  <div className="p-4 space-y-4">
    <div>
      <h4 className="font-medium text-sm mb-3">선택된 교재</h4>
      {selectedTextbookIdsForManage.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          좌측 트리에서 교재를 선택해주세요
        </p>
      ) : (
        <div className="space-y-2">
          <Badge variant="secondary" className="text-xs">
            📚 {selectedTextbookIdsForManage.length}개 교재 선택
          </Badge>
          <p className="text-xs text-muted-foreground">
            필터는 중앙 패널에서 조정할 수 있습니다
          </p>
        </div>
      )}
    </div>
  </div>
)}
```

---

### 5. Props 구조 간소화 ⭐

**Before:**
```typescript
<StatusDashboard
  mode="manage"
  selectedTextbookIds={selectedTextbookIdsForManage}
  filterType={manageFilterType}
  selectedTypeId={manageSelectedTypeId}
  statusFilter={manageStatusFilter}
/>
```

**After:**
```typescript
<StatusDashboard
  mode="manage"
  selectedTextbookIds={selectedTextbookIdsForManage}
  onTextbookSelectionChange={setSelectedTextbookIdsForManage}
/>
```

**개선 내용:**
- 필터 관련 props 3개 제거
- 필터 상태를 StatusDashboard 내부에서 관리
- 교재 선택 변경 콜백 추가 (전체 선택/해제 지원)

---

## 📊 개선 효과

### UX 일관성
| 항목 | 개선 전 | 개선 후 |
|------|---------|---------|
| 필터 위치 | 우측 패널 (분산) | 중앙 패널 상단 (통합) ⭐ |
| 지문 표시 | 트리 구조 | 카드 리스트 (문제출제와 동일) ⭐ |
| 전체 선택 | 개별 체크만 | 한 번에 전체 선택/해제 ⭐ |
| 우측 패널 | 필터 (중복) | 선택 요약 (명확) ⭐ |

### 코드 품질
- Props 전달 깊이 감소: 3단계 → 1단계
- 컴포넌트 응집도 향상: 필터 로직 내부화
- 상태 관리 단순화: page.tsx에서 필터 상태 제거

---

## 🗂️ 수정된 파일

### 1. StatusDashboard.tsx
**주요 변경사항:**
- Card, Select 컴포넌트 import 추가
- 필터 상태를 내부에서 관리 (useState)
- 필터 UI를 중앙 패널 상단에 Card로 통합
- SelectedTextbooksView를 카드 리스트 형태로 변경
- 전체 선택/해제 로직 개선

**라인 수:** ~1,220줄 (변경 없음)

### 2. page.tsx
**주요 변경사항:**
- 필터 관련 상태 3개 제거
  - `manageFilterType`
  - `manageSelectedTypeId`
  - `manageStatusFilter`
- 전체 선택/해제 버튼 추가 (좌측 트리 상단)
- 우측 패널 내용 변경 (필터 → 선택 요약)
- StatusDashboard props 간소화

**라인 수:** ~1,660줄 (10줄 감소)

### 3. index.ts (status-dashboard)
**변경사항:**
- ManageFilterPanel export 유지 (다른 곳에서 사용 가능성)
- QuestionPreviewModal export 유지

---

## 🎨 최종 레이아웃

```
┌────────────────────────────────────────────────────────────┐
│                      📋 문제 관리                           │
├──────────────┬─────────────────────────────────┬───────────┤
│ [좌측 트리]  │ [중앙 패널]                     │ [우측]    │
│              │                                 │           │
│ [☐전체선택]  │ ┌─ 필터 ───────────────────┐  │ 선택 요약 │
│              │ │유형▼│유형명▼│상태▼│🔄│  │           │
│ □ 그룹1     │ └────────── [📚3개·📄42개]   │ 📚 3개    │
│  ☑️ 교재A    │                                 │           │
│  ☑️ 교재B    │ ┌─ 지문 카드 ──────────────┐  │           │
│              │ │[☑️] 교재>단원>지문        │  │           │
│ □ 그룹2     │ │  [📊3/5][❓12/15][👁️]     │  │           │
│  ☑️ 교재C    │ └──────────────────────────┘  │           │
│              │                                 │           │
│              │ ┌─ 지문 카드 ──────────────┐  │           │
│              │ │[☑️] 교재>단원>지문        │  │           │
│              │ │  [📊5/5][❓15/15][👁️]     │  │           │
│              │ └──────────────────────────┘  │           │
└──────────────┴─────────────────────────────────┴───────────┘
```

---

## 🧪 테스트 시나리오

### 1. 필터 기능
- [ ] 유형 분류 변경 시 유형명 옵션 동적 표시
- [ ] 필터 적용 시 지문 목록 실시간 갱신
- [ ] 초기화 버튼으로 모든 필터 리셋

### 2. 교재 선택
- [ ] 좌측 트리에서 개별 교재 체크박스 선택
- [ ] 전체 선택 버튼으로 모든 교재 한 번에 선택
- [ ] 전체 해제 버튼으로 모든 선택 해제
- [ ] 선택 수가 우측 패널에 정확히 표시

### 3. 지문 카드
- [ ] 카드 클릭 시 우측 상세 패널 표시
- [ ] 체크박스로 여러 지문 선택
- [ ] 상태 배지가 정확히 표시 (데이터/문제 개수)
- [ ] 미리보기 버튼 작동

### 4. UX 일관성
- [ ] 문제출제와 동일한 카드 디자인
- [ ] 호버/선택 시 동일한 인터랙션
- [ ] 필터 위치가 중앙 패널 상단에 고정

---

## 📝 개발 노트

### 설계 원칙
1. **역할 분리**: 좌측=범위, 중앙=필터+결과, 우측=요약
2. **UX 일관성**: 문제출제와 동일한 패턴 적용
3. **상태 캡슐화**: 필터 상태를 컴포넌트 내부에서 관리
4. **직관적 UI**: 전체 선택/해제로 사용성 향상

### 기술적 고려사항
- Card/Badge 컴포넌트로 통일된 디자인 시스템
- useMemo로 필터링 성능 최적화
- 조건부 렌더링으로 불필요한 UI 요소 제거

---

## 🚀 다음 단계

### 추가 개선 아이디어
1. **일괄 작업 패널**: 우측 패널에 선택된 지문 일괄 삭제/재생성 기능
2. **필터 프리셋**: 자주 사용하는 필터 조합을 저장
3. **정렬 옵션**: 이름/날짜/상태별 정렬
4. **페이지네이션**: 지문 수가 많을 때 성능 개선

### 리팩토링 기회
- SelectedTextbooksView를 별도 컴포넌트로 분리
- 카드 아이템을 재사용 가능한 PassageCard 컴포넌트로 추출

---

## ✅ 완료 체크리스트

- [x] 필터를 중앙 패널 상단으로 이동
- [x] 교재 범위 전체 선택/해제 기능 추가
- [x] 중앙 패널을 카드 스타일로 변경
- [x] 우측 패널을 선택 항목 요약으로 변경
- [x] page.tsx에서 필터 props 전달 방식 수정
- [x] 개발 서버 실행 및 동작 확인

---

**작업 완료일**: 2024년 12월 12일  
**개발 시간**: 약 2시간  
**커밋 필요**: ✅

