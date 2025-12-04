# 📚 문제출제 관리 시스템

AI 기반 문제 생성 및 관리 시스템

## 🛠️ 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **UI**: shadcn/ui + Tailwind CSS
- **Deployment**: Vercel

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 설정

#### 2.1 프로젝트 생성
1. [Supabase](https://supabase.com) 접속
2. 새 프로젝트 생성
3. Project Settings > API에서 URL과 anon key 복사

#### 2.2 데이터베이스 스키마 적용
1. Supabase Dashboard > SQL Editor 이동
2. `supabase/schema.sql` 파일 내용 복사 & 실행

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI (AI 생성 기능용 - 선택사항)
OPENAI_API_KEY=your-openai-api-key
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 📂 프로젝트 구조

```
src/
├── app/
│   ├── api/              # API Routes
│   │   ├── groups/       # 그룹 CRUD
│   │   ├── textbooks/    # 교재 CRUD
│   │   ├── data-types/   # 데이터 유형 CRUD
│   │   ├── question-types/ # 문제 유형 CRUD
│   │   └── passages/     # 지문 CRUD
│   ├── globals.css       # 전역 스타일 (GitHub 테마)
│   ├── layout.tsx        # 루트 레이아웃
│   └── page.tsx          # 메인 페이지
├── components/
│   ├── layout/           # 레이아웃 컴포넌트
│   └── ui/               # shadcn/ui 컴포넌트
├── hooks/                # 커스텀 훅
├── lib/
│   └── supabase/         # Supabase 클라이언트
└── types/                # TypeScript 타입
```

## 📊 데이터베이스 스키마

### 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `groups` | 교재 그룹 |
| `textbooks` | 교재 |
| `units` | 단원 |
| `passages` | 지문 |
| `data_types` | 데이터 유형 정의 |
| `question_types` | 문제 유형 정의 |
| `generated_data` | 생성된 데이터 |
| `generated_questions` | 생성된 문제 |

## 🔑 API 엔드포인트

### Groups
- `GET /api/groups` - 모든 그룹 조회
- `POST /api/groups` - 새 그룹 생성
- `GET /api/groups/[id]` - 특정 그룹 조회
- `PATCH /api/groups/[id]` - 그룹 수정
- `DELETE /api/groups/[id]` - 그룹 삭제

### Textbooks
- `GET /api/textbooks` - 모든 교재 조회
- `POST /api/textbooks` - 새 교재 생성
- `GET /api/textbooks/[id]` - 특정 교재 조회
- `PATCH /api/textbooks/[id]` - 교재 수정
- `DELETE /api/textbooks/[id]` - 교재 삭제

### Data Types
- `GET /api/data-types` - 모든 데이터 유형 조회
- `POST /api/data-types` - 새 데이터 유형 생성
- `GET /api/data-types/[id]` - 특정 데이터 유형 조회
- `PATCH /api/data-types/[id]` - 데이터 유형 수정
- `DELETE /api/data-types/[id]` - 데이터 유형 삭제

### Question Types
- `GET /api/question-types` - 모든 문제 유형 조회
- `POST /api/question-types` - 새 문제 유형 생성
- `GET /api/question-types/[id]` - 특정 문제 유형 조회
- `PATCH /api/question-types/[id]` - 문제 유형 수정
- `DELETE /api/question-types/[id]` - 문제 유형 삭제

## 🚢 배포

### Vercel 배포

1. [Vercel](https://vercel.com)에서 GitHub 저장소 연결
2. 환경 변수 설정 (Settings > Environment Variables)
3. 자동 배포 완료!

## 📝 라이선스

MIT License
