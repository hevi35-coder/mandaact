# 📱 MandaAct 배포 가이드

> 문서 인덱스: `docs/README.md`

## 프로젝트 개요
- **프로젝트명**: MandaAct
- **스택**:
  - **Web**: React 18 + TypeScript + Vite + Supabase
  - **Mobile**: React Native + Expo + NativeWind
- **저장소**: https://github.com/hevi35-coder/mandaact
- **목적**: Web(PWA) 및 Mobile(iOS/Android) 배포

## 현재 상태 (2025-12-01)
- ✅ Web App (PWA) 프로덕션 배포 완료
- ✅ Mobile App (iOS/Android) 개발 완료
- ✅ Monorepo 구조 마이그레이션 완료
- ✅ Supabase 백엔드 안정화 완료

---

## 🚀 배포 플랫폼: Vercel (추천)

### 선택 이유
1. GitHub 자동 배포 (커밋 시 자동 재배포)
2. 무료 Hobby 플랜으로 충분
3. HTTPS 자동 설정
4. 글로벌 CDN으로 빠른 속도
5. 환경 변수 관리 간편
6. Vite 프로젝트 최적화 지원

---

## 📋 배포 전 체크리스트

### 1. 빌드 테스트 (Web)
```bash
# TypeScript 타입 체크
pnpm type-check

# 프로덕션 빌드
pnpm build:web

# 빌드 결과 미리보기
pnpm preview
```

**예상 결과:**
- `apps/web/dist/` 폴더 생성
- 빌드 에러 없음
- `http://localhost:4173`에서 확인 가능

### 2. 빌드 테스트 (Mobile)
```bash
# TypeScript 타입 체크
pnpm type-check

# 로컬 빌드 테스트 (EAS CLI 필요)
eas build --platform android --profile preview --local
```

### 2. 환경 변수 준비
Vercel에 설정할 환경 변수 (`.env.local` 참고):
```
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**획득 방법:**
1. Supabase 대시보드 접속
2. Project Settings > API
3. Project URL과 anon/public key 복사

### 3. Supabase 백엔드 확인
```bash
# Edge Functions 배포 상태 확인
npx supabase functions list

# 필요 시 재배포
npx supabase functions deploy ocr-mandalart
npx supabase functions deploy chat
npx supabase functions deploy generate-report
```

**필수 확인 항목:**
- ✅ RLS (Row Level Security) 정책 활성화
- ✅ Storage 정책 설정 (mandalart-images 버킷)
- ✅ Edge Functions 배포 완료

---

## 🎯 Vercel 배포 단계

### Step 1: Vercel 계정 생성
1. https://vercel.com 접속
2. "Sign Up" 클릭
3. GitHub 계정으로 연동

### Step 2: 프로젝트 Import
1. Vercel 대시보드에서 "Add New" > "Project" 클릭
2. GitHub 저장소 목록에서 `mandaact` 선택
3. Import 클릭

### Step 3: 프로젝트 설정
**Build & Development Settings:**
- Framework Preset: Vite
- Root Directory: `apps/web` (Monorepo 설정)
- Build Command: `pnpm build` (또는 `npm run build`)
- Output Directory: `dist`
- Install Command: `pnpm install`

**환경 변수 설정:**
1. "Environment Variables" 섹션 펼치기
2. 다음 변수 추가:
   ```
   Name: VITE_SUPABASE_URL
   Value: [Supabase Project URL]

   Name: VITE_SUPABASE_ANON_KEY
   Value: [Supabase Anon Key]
   ```
3. Environment: Production, Preview, Development 모두 체크

### Step 4: 배포 실행
1. "Deploy" 버튼 클릭
2. 배포 진행 상황 모니터링 (약 1-2분 소요)
3. 성공 시 배포 URL 확인 (예: `mandaact.vercel.app`)

### Step 5: 도메인 설정 (선택)
1. Project Settings > Domains
2. 원하는 도메인 추가
3. DNS 설정 (Vercel 안내 따르기)

---

## 📱 Mobile 배포: EAS Build

### Step 1: EAS CLI 설치 및 로그인
```bash
npm install -g eas-cli
eas login
```

### Step 2: 프로젝트 설정
```bash
cd apps/mobile
eas build:configure
```

### Step 3: 환경 변수 설정 (EAS Secrets)
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
```

### Step 4: 빌드 실행
```bash
# Android APK (Preview)
eas build --platform android --profile preview

# iOS Simulator (Preview)
eas build --platform ios --profile preview

# Production (Store)
eas build --platform all --profile production
```

### Step 5: 스토어 제출 (EAS Submit)
```bash
eas submit --platform all
```

---

## ✅ 배포 후 테스트

### 기본 기능 테스트
1. **접속 테스트**
   - 배포된 URL로 접속
   - 로딩 시간 확인 (초기 로딩 3초 이내)

2. **인증 테스트**
   - 회원가입 기능
   - 로그인 기능
   - 로그아웃 기능

3. **핵심 기능 테스트**
   - 만다라트 생성 (수동 입력)
   - 만다라트 생성 (이미지 OCR) - Edge Function 연동
   - 오늘의 실천 체크
   - AI 리포트 생성

4. **PWA 기능 테스트**
   - 홈 화면에 추가 가능 여부
   - 오프라인 동작 확인
   - 푸시 알림 권한 요청

### 스마트폰 테스트

#### iOS (Safari)
1. Safari에서 배포 URL 접속
2. 공유 버튼 (↑) 탭
3. "홈 화면에 추가" 선택
4. 아이콘 이름 확인: "MandaAct"
5. 홈 화면에서 앱 실행
6. 전체 화면 모드 확인 (주소창 없음)

#### Android (Chrome)
1. Chrome에서 배포 URL 접속
2. 메뉴 (⋮) 탭
3. "홈 화면에 추가" 선택
4. 또는 자동 설치 배너 확인
5. 홈 화면에서 앱 실행

---

## 🔧 트러블슈팅

### 빌드 실패 시
```bash
# 캐시 삭제 후 재시도
rm -rf node_modules dist
npm install
npm run build
```

### 환경 변수 오류 시
- Vercel 대시보드 > Project Settings > Environment Variables
- 변수명 정확히 확인 (`VITE_` 접두사 필수)
- 변수 값에 공백이나 따옴표 없는지 확인
- 배포 후 Redeploy 필요

### Supabase 연결 오류 시
1. Supabase 대시보드에서 URL과 Key 재확인
2. Supabase Project Settings > API > Allow List
3. Vercel 도메인 추가 (필요한 경우)

### CORS 오류 시
- Supabase 대시보드 > Authentication > URL Configuration
- Site URL에 Vercel 도메인 추가
- Redirect URLs에 Vercel 도메인 추가

### Edge Functions 오류 시
```bash
# 함수 로그 확인
npx supabase functions logs ocr-mandalart --tail

# 재배포
npx supabase functions deploy ocr-mandalart
```

---

## 🔄 자동 배포 설정

Vercel은 GitHub와 자동 연동되어 있어 다음과 같이 동작합니다:

### Production 배포
- `main` 브랜치에 push → 자동으로 프로덕션 배포
- 배포 URL: `mandaact.vercel.app`

### Preview 배포
- Pull Request 생성 → 자동으로 미리보기 배포
- 각 PR마다 고유한 Preview URL 생성
- PR 머지 전 테스트 가능

### 배포 알림
- GitHub 커밋에 배포 상태 자동 업데이트
- Vercel 대시보드에서 배포 히스토리 확인
- 슬랙/디스코드 알림 설정 가능

---

## 📊 모니터링

### Vercel Analytics (무료)
- Project Settings > Analytics
- 페이지 뷰, 사용자 수 확인
- Core Web Vitals 성능 지표

### Supabase Dashboard
- Database > Table Editor: 사용자 데이터 확인
- Storage: 업로드된 이미지 확인
- Logs: Edge Functions 로그 확인

---

## 🔐 보안 체크리스트

- ✅ 환경 변수는 Vercel에서만 관리 (Git에 포함 안됨)
- ✅ Supabase RLS 정책 활성화
- ✅ API 키는 anon key만 사용 (service role key는 서버에서만)
- ✅ HTTPS 자동 적용 (Vercel 기본)
- ✅ Storage 파일 접근 권한 설정

---

## 📝 배포 후 업데이트 방법

```bash
# 1. 로컬에서 코드 수정
# 2. 변경사항 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# 3. GitHub에 푸시
git push origin main

# 4. Vercel이 자동으로 감지하고 배포 (1-2분 소요)
# 5. 배포 완료 알림 확인
```

---

## 🎯 다음 단계

배포 완료 후:
1. 스마트폰에서 일주일 사용 테스트
2. 사용자 피드백 수집
3. 성능 지표 분석 (Vercel Analytics)
4. 버그 수정 및 기능 개선
5. 앱스토어/플레이스토어 등록 고려 (선택사항)

---

## 📞 지원

- Vercel 문서: https://vercel.com/docs
- Supabase 문서: https://supabase.com/docs
- 프로젝트 이슈: https://github.com/hevi35-coder/mandaact/issues
