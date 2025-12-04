# 🔧 Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

### 1.1 계정 생성 및 로그인
1. [https://supabase.com](https://supabase.com) 접속
2. GitHub 또는 이메일로 회원가입/로그인

### 1.2 새 프로젝트 생성
1. Dashboard에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Organization**: 기존 조직 선택 또는 새로 생성
   - **Project name**: `question-generator` (원하는 이름)
   - **Database Password**: 안전한 비밀번호 설정 (메모 필요!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (가장 가까운 지역)
3. "Create new project" 클릭

### 1.3 프로젝트 초기화 대기
- 약 1-2분 소요
- 초기화 완료 후 Dashboard 접근 가능

## 2. API 키 확인

### 2.1 API 설정 페이지 이동
1. 좌측 메뉴에서 ⚙️ **Project Settings** 클릭
2. **API** 탭 선택

### 2.2 필요한 정보 복사
```
Project URL: https://xxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. 데이터베이스 스키마 적용

### 3.1 SQL Editor 이동
1. 좌측 메뉴에서 📝 **SQL Editor** 클릭
2. "New query" 클릭

### 3.2 스키마 SQL 실행
1. 프로젝트의 `supabase/schema.sql` 파일 내용 전체 복사
2. SQL Editor에 붙여넣기
3. **Run** 버튼 클릭 (또는 Ctrl+Enter)

### 3.3 테이블 확인
1. 좌측 메뉴에서 🗄️ **Table Editor** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - `groups`
   - `textbooks`
   - `units`
   - `passages`
   - `data_types`
   - `data_type_dependencies`
   - `question_types`
   - `question_type_items`
   - `generated_data`
   - `generated_questions`

## 4. 환경 변수 설정

### 4.1 .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI 생성 기능용 (선택사항 - Phase 5에서 사용)
OPENAI_API_KEY=sk-...
```

### 4.2 주의사항
- `.env.local` 파일은 `.gitignore`에 포함되어 있어 GitHub에 업로드되지 않음
- 절대로 API 키를 공개 저장소에 커밋하지 마세요!

## 5. 연결 테스트

### 5.1 개발 서버 재시작
```bash
npm run dev
```

### 5.2 API 테스트
브라우저에서 확인:
```
http://localhost:3000/api/groups
```

빈 배열 `[]`이 반환되면 연결 성공!

## 6. Vercel 배포 시 환경 변수 설정

### 6.1 Vercel Dashboard
1. 프로젝트 > Settings > Environment Variables

### 6.2 변수 추가
| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGci... | Production, Preview, Development |

## 🔒 보안 참고사항

### RLS (Row Level Security)
- 현재 MVP용으로 모든 접근이 허용됨
- 프로덕션 배포 시 적절한 RLS 정책 설정 필요
- 회원관리 기능 추가 시 인증 기반 접근 제어 구현 예정

### API 키 보안
- `anon` 키는 클라이언트에서 사용 가능 (public)
- `service_role` 키는 절대 클라이언트에 노출 금지
- RLS가 활성화되어 있으면 `anon` 키로도 안전

## ❓ 문제 해결

### "Failed to fetch" 에러
1. `.env.local` 파일 존재 확인
2. 환경 변수 값이 올바른지 확인
3. 개발 서버 재시작

### 테이블이 없다는 에러
1. SQL Editor에서 스키마 실행 확인
2. 에러 메시지가 있었다면 SQL 수정 후 재실행

### CORS 에러
- Supabase는 기본적으로 CORS를 허용함
- 문제 발생 시 Dashboard > Settings > API에서 확인

