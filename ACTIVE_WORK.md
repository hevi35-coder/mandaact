# 🚀 현재 진행 중인 작업 (ACTIVE WORK)

**마지막 업데이트**: 2025-11-24 (전략 변경)
**현재 작업**: React Native 이관 - Phase 2 (React 19 통일)
**상태**: 🟡 진행 중 - React 19로 전체 업그레이드

---

## ✅ 전략 변경 (IMPORTANT!)

### 결정: React 19로 전체 통일
**이유**: Expo Go 앱이 React 19 이상만 지원

### 현재 상태
```
apps/web:      React 18.3.1 → 19.1.0 업그레이드 필요
apps/mobile:   React 19.1.0 ✓ (이미 완료!)
packages/shared: React 18.3.1 peer → 19.1.0 변경 필요
```

**작업 방향**:
1. ✅ Mobile은 이미 React 19 (유지)
2. 🔄 Web을 React 19로 업그레이드
3. 🔄 Shared를 React 19 peer로 변경
4. ✅ 전체 React 버전 통일 달성

---

## 📝 오늘 해야 할 일 (TODO)

### 🔴 긴급 (HIGH PRIORITY)
- [ ] **Web app React 19 업그레이드**
  - `apps/web/package.json` 수정
  - `react: ^18.3.1` → `react: ^19.1.0`
  - `react-dom: ^18.3.1` → `react-dom: ^19.1.0`
  - `@types/react: ^18.3.5` → `@types/react: ^19.1.0`
  - `@types/react-dom: ^18.3.0` → `@types/react-dom: ^19.1.0`

- [ ] **Shared package React 19 peerDependency 변경**
  - `packages/shared/package.json` 수정
  - `"react": "^18.3.1"` → `"react": "^19.1.0"`

- [ ] **의존성 재설치 및 검증**
  - `rm -rf node_modules package-lock.json` (root)
  - `npm install` (root에서)
  - `npm ls react` (전체 확인 - 모두 19.1.0이어야 함)

### 🟡 중요 (MEDIUM)
- [ ] **Web app 빌드 테스트 (React 19)**
  - `cd apps/web && npm run build`
  - TypeScript 에러 확인
  - React 19 Breaking Changes 대응

- [ ] **Shared package 빌드 및 연결 테스트**
  - `cd packages/shared && npm run build`
  - Mobile에서 import 테스트
  - Supabase 초기화 확인

- [ ] **Mobile app 실행 테스트**
  - `npm run mobile`
  - Expo Go 앱에서 로드 확인
  - Hooks 에러 없는지 검증
  - Metro bundler 정상 작동 확인

### 🟢 일반 (NORMAL - 다음 Phase)
- [ ] Navigation 구현 시작
- [ ] 로그인 화면 기본 UI
- [ ] React 19 마이그레이션 문서 작성

---

## 🎯 다음 Phase

### Phase 2 완료 조건
- [x] Monorepo 구조 완성
- [x] Shared package 생성
- [x] Mobile app React 19 설정 완료
- [ ] **Web app React 19 업그레이드** ← 현재 여기
- [ ] **Shared React 19 peerDep 변경**
- [ ] React 버전 통일 검증 (전체 19.1.0)
- [ ] Mobile app 기본 실행
- [ ] Shared package 연동 확인

### Phase 3 목표 (다음 단계)
- Navigation 구조 구현
- 로그인/홈 화면 UI
- Supabase 연동 테스트

---

## 📌 놓치지 않기 위한 체크리스트

### 매 세션 시작 시
1. ✅ 이 문서 읽기 (`ACTIVE_WORK.md`)
2. ✅ Git 상태 확인 (`git status`)
3. ✅ 브랜치 확인 (`git branch`)
4. ✅ 미완료 TODO 확인

### 매 세션 종료 시
1. ✅ 이 문서 업데이트
2. ✅ Git commit (작업 단위별)
3. ✅ 다음 작업 명시
4. ✅ 차단 요소 기록

---

## 📚 관련 문서

### 핵심 문서 (반드시 참고)
1. **Migration Plan**: `docs/features/REACT_NATIVE_MIGRATION_V2.md`
2. **Roadmap**: `docs/migration/REACT_NATIVE_MIGRATION_ROADMAP.md`
3. **Technical Decisions**: `docs/migration/TECHNICAL_DECISIONS.md`
4. **Timeline**: `docs/migration/IMPLEMENTATION_TIMELINE.md`

### 중요 섹션
- Migration v2 Plan - Phase 2.2: React 버전 명시적 설정
- 검증 체크리스트: npm ls react 확인

---

## ⚡ 빠른 명령어

```bash
# React 버전 확인 (전체 19.1.0이어야 함!)
npm ls react

# 전체 의존성 재설치 (React 19 업그레이드 후)
rm -rf node_modules package-lock.json
npm install

# Web 앱 실행
npm run web

# Web 빌드 테스트 (React 19 호환성)
cd apps/web
npm run build

# Mobile 앱 실행
npm run mobile

# TypeScript 빌드 (Shared)
cd packages/shared
npm run build
```

---

## 🐛 알려진 문제

### 1. ⚠️ CRITICAL: React 19 타입 호환성 문제 (발생!)
- **상태**: 🔴 차단됨
- **발생일**: 2025-11-24
- **문제**: 라이브러리들이 React 19 완전 지원 안 함
  - react-router-dom: ReactNode 타입 불일치
  - lucide-react: ForwardRef 타입 불일치
  - @radix-ui/*: ReactElement 타입 불일치
- **영향**: TypeScript 컴파일 실패 (100+ 에러)
- **원인**: React 19의 ReactNode 타입 정의 변경

### 2. React 19.2.0 혼재 문제
- **상태**: 🟡 진행 중
- **문제**: 19.1.0 요구하는데 19.2.0이 설치됨
- **시도**: overrides 추가했으나 완전히 적용 안 됨
- **근본 원인**: 일부 라이브러리가 ^19.0.0 범위 요구

### 3. Expo Go + React 19 호환성 재확인 필요
- **상태**: 🟡 검증 필요
- **의문**: Expo Go가 정말 React 19만 지원하는가?
- **확인 필요**: React Native 0.81.5가 React 19를 공식 지원하는가?

---

## 📖 학습 내용 (Lessons Learned)

### 이번 세션
1. **문제**: React 버전 불일치 발견
2. **원인**: 커밋 메시지만 믿고 실제 package.json 확인 안 함
3. **전략 변경**: Expo Go 호환성으로 React 19 통일 결정
4. **교훈**:
   - 항상 `npm ls react`로 실제 버전 검증 필요
   - 플랫폼 제약사항(Expo Go) 먼저 확인 필요
   - 문서로 작업 추적 시스템화 중요

---

## 🔔 알림 설정 (자동화 아이디어)

### Git Hook으로 자동 리마인더
```bash
# .git/hooks/post-checkout
#!/bin/bash
echo "================================"
echo "📌 ACTIVE_WORK.md를 확인하세요!"
echo "================================"
cat ACTIVE_WORK.md | head -20
```

### VS Code Tasks
```json
// .vscode/tasks.json
{
  "label": "Check Active Work",
  "type": "shell",
  "command": "cat ACTIVE_WORK.md"
}
```

---

## ✨ 다음 업데이트

**완료 시**: React 버전 통일 완료, Mobile 앱 실행 성공
**업데이트 예정**: 2025-11-24 (작업 완료 후)

---

**작성자**: Claude (Session Tracker)
**목적**: 작업을 절대 놓치지 않기 위한 실시간 추적 문서
