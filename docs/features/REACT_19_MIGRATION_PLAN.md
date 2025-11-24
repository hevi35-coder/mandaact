# React 19 마이그레이션 계획

**작성일**: 2025-11-24
**상태**: 진행 중
**전략**: 전체 Monorepo를 React 19로 통일

---

## 🎯 목표

**Expo Go 호환성**을 위해 Web + Mobile + Shared 모두 React 19.1.0으로 통일

---

## 📊 현재 상태

### Before (발견 시점)
```
apps/web:         React 18.3.1
apps/mobile:      React 19.1.0
packages/shared:  React 18.3.1 (peerDependency)
```

### After (목표)
```
apps/web:         React 19.1.0 ✓
apps/mobile:      React 19.1.0 ✓ (이미 완료)
packages/shared:  React 19.1.0 (peerDependency) ✓
```

---

## 🔄 마이그레이션 단계

### Phase 1: Web App 업그레이드 ⏳

#### 1.1 package.json 수정
```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0"
  }
}
```

#### 1.2 React 19 Breaking Changes 확인

**필수 체크 항목**:

1. **ReactDOM.render 제거**
   ```typescript
   // ❌ Old (React 18)
   ReactDOM.render(<App />, document.getElementById('root'))

   // ✅ New (React 19)
   const root = ReactDOM.createRoot(document.getElementById('root')!)
   root.render(<App />)
   ```

2. **PropTypes 제거**
   - React 19에서 PropTypes 완전 제거됨
   - TypeScript로 모든 타입 검증 필요
   ```typescript
   // ❌ Old
   Component.propTypes = { ... }

   // ✅ New
   interface ComponentProps { ... }
   ```

3. **defaultProps 제거 (함수형 컴포넌트)**
   ```typescript
   // ❌ Old
   const Component = ({ name = 'default' }) => { ... }
   Component.defaultProps = { name: 'default' }

   // ✅ New
   const Component = ({ name = 'default' }: Props) => { ... }
   ```

4. **Context API 변경**
   - `useContext` 사용 방식 동일
   - Context Provider 최적화 개선됨

5. **자동 배칭 (Automatic Batching)**
   - 이미 React 18에서 도입되어 호환됨
   - setTimeout, Promise 등에서도 자동 배칭

#### 1.3 주요 라이브러리 React 19 호환성 확인

| 라이브러리 | 현재 버전 | React 19 호환 | 비고 |
|----------|----------|--------------|------|
| @tanstack/react-query | 5.56.0 | ✅ Yes | React 19 호환 |
| react-router-dom | 6.26.0 | ✅ Yes | React 19 호환 |
| zustand | 4.5.5 | ✅ Yes | React 버전 무관 |
| framer-motion | 12.23.24 | ✅ Yes | React 19 호환 |
| @radix-ui/* | 2.x | ✅ Yes | React 19 호환 |
| react-hook-form | 7.65.0 | ✅ Yes | React 19 호환 |

#### 1.4 빌드 및 테스트
```bash
cd apps/web
npm install
npm run type-check
npm run build
npm run dev
```

---

### Phase 2: Shared Package 업그레이드 ⏳

#### 2.1 package.json 수정
```json
{
  "peerDependencies": {
    "react": "^19.1.0",
    "react-native": "*"
  }
}
```

#### 2.2 빌드 확인
```bash
cd packages/shared
npm install
npm run build
```

---

### Phase 3: Mobile App 검증 ✅

Mobile은 이미 React 19.1.0 사용 중이므로 추가 작업 불필요.

**검증 항목**:
```bash
cd apps/mobile
npm ls react        # 19.1.0 확인
npm start           # Expo 실행
```

---

### Phase 4: 전체 검증 ⏳

#### 4.1 React 버전 통일 확인
```bash
# Root에서
npm ls react

# 예상 출력 (모두 19.1.0이어야 함)
mandaact-monorepo@1.0.0
├─┬ apps/web
│ └── react@19.1.0
├─┬ apps/mobile
│ └── react@19.1.0
└─┬ packages/shared
  └── react@19.1.0 (peer)
```

#### 4.2 전체 빌드 테스트
```bash
# Web
npm run web:build

# Mobile
npm run mobile
```

#### 4.3 기능 테스트
- [ ] Web 앱 로그인
- [ ] Web 앱 주요 기능 확인
- [ ] Mobile 앱 실행
- [ ] Mobile에서 Shared package import 테스트

---

## ⚠️ 주의사항

### React 19 주요 변경사항

1. **새로운 Hooks**
   - `use()` - Promise, Context를 읽는 새로운 hook
   - `useOptimistic()` - 낙관적 업데이트
   - `useFormStatus()` - 폼 상태 추적

2. **ref as prop**
   ```typescript
   // ✅ React 19에서 가능
   <Component ref={myRef} />
   // forwardRef 불필요!
   ```

3. **Context Provider 간소화**
   ```typescript
   // ✅ React 19
   <Context value={value}>
     {children}
   </Context>

   // ❌ Old
   <Context.Provider value={value}>
     {children}
   </Context.Provider>
   ```

4. **Server Components 지원**
   - Web PWA에서는 현재 미사용
   - 추후 고려 가능

### 호환성 문제 대응

**문제 발생 시**:
1. 에러 메시지 확인
2. React 19 migration guide 참조
3. 라이브러리 최신 버전 확인
4. 필요 시 polyfill 추가

---

## 📚 참고 자료

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React 19 Breaking Changes](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#breaking-changes)

---

## ✅ 체크리스트

### Web App
- [ ] package.json React 19 업데이트
- [ ] 의존성 재설치
- [ ] ReactDOM.createRoot 확인
- [ ] PropTypes 제거 확인
- [ ] TypeScript 에러 확인
- [ ] 빌드 성공
- [ ] 개발 서버 실행 성공
- [ ] 주요 기능 테스트

### Shared Package
- [ ] package.json peerDependency 업데이트
- [ ] 빌드 성공
- [ ] 타입 에러 없음

### Mobile App
- [x] React 19.1.0 확인 (이미 완료)
- [ ] Expo 실행 성공
- [ ] Shared package import 성공

### 전체
- [ ] npm ls react 검증 (모두 19.1.0)
- [ ] Web + Mobile 동시 실행 테스트
- [ ] 문서 업데이트

---

## 🚀 다음 단계

React 19 통일 완료 후:
1. Navigation 구현
2. 로그인/홈 화면 UI
3. Supabase 연동 테스트
4. OCR 기능 구현

---

**마지막 업데이트**: 2025-11-24
**다음 리뷰**: React 19 업그레이드 완료 후
