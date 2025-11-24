# React 19 Migration Issues

**날짜**: 2025-11-24
**상태**: 차단됨 - 라이브러리 호환성 문제

---

## 🚨 발생한 문제

### 1. TypeScript 타입 에러 (100+ errors)

**에러 예시**:
```
error TS2786: 'Routes' cannot be used as a JSX component.
  Its type '...' is not a valid JSX element type.
  Property 'children' is missing in type 'ReactElement...' but required in type 'ReactPortal'.
```

**영향받는 라이브러리**:
- `react-router-dom` - Routes, Route 컴포넌트
- `lucide-react` - 모든 아이콘 컴포넌트
- `@radix-ui/*` - 모든 UI 컴포넌트
- `react-day-picker` - 캘린더 컴포넌트

---

## 🔍 원인 분석

### React 19의 ReactNode 타입 변경

React 19에서 `ReactNode` 타입이 변경되었습니다:

```typescript
// React 18
type ReactNode =
  | ReactElement
  | string
  | number
  | null
  | undefined

// React 19
type ReactNode =
  | ReactElement
  | string
  | number
  | bigint
  | Iterable<ReactNode>
  | Promise<ReactNode>
  | null
  | undefined
```

이로 인해 많은 라이브러리의 타입 정의가 호환되지 않습니다.

---

## 📊 옵션 분석

### 옵션 1: React 18.3.1로 롤백 ✅ 추천
**장점**:
- 모든 라이브러리 완벽 호환
- 안정적이고 검증됨
- 즉시 작업 진행 가능

**단점**:
- Expo Go 호환성 확인 필요

**작업량**: 30분

---

### 옵션 2: React 19 RC 버전 사용
**장점**:
- React 19 기능 사용 가능
- 일부 타입 문제 해결됨

**단점**:
- 여전히 불안정
- 프로덕션 사용 권장 안 됨

**작업량**: 1-2시간

---

### 옵션 3: TypeScript 에러 무시 (skipLibCheck)
**장점**:
- 런타임에서는 작동할 수 있음

**단점**:
- 타입 안정성 상실
- 런타임 에러 위험
- 유지보수 어려움

**작업량**: 10분 (비추천)

---

### 옵션 4: 라이브러리 업데이트 대기
**장점**:
- 장기적으로 올바른 해결

**단점**:
- 시간이 오래 걸림 (몇 주~몇 달)
- 작업 차단됨

**작업량**: 대기

---

## ✅ 권장 사항

### 1️⃣ Expo Go 호환성 재확인 ✅ 완료

**확인 결과** (2025-11-24):
- ✅ **Expo SDK 54**: React Native 0.81 + **React 19.1.0** (공식 확인됨)
- ✅ **Expo SDK 53**: React Native 0.79 + React 19.0.0
- ✅ **Expo SDK 52**: React Native 0.76-0.78 + **React 18** ✅
- ✅ **Expo SDK 51**: React Native 0.74 + React 18.2.0 ✅

**결론**:
- Expo SDK 54를 사용하려면 **React 19 필수**
- React 18을 사용하려면 **Expo SDK 52 이하로 다운그레이드 필요**

---

### 2️⃣ 새로운 권장사항: Expo SDK 52 + React 18.3.1 다운그레이드

**추천 이유**:
- Expo SDK 52는 React 18 지원 (RN 0.76-0.78)
- 모든 라이브러리 완벽 호환
- 안정적이고 검증됨
- SDK 52는 SDK 51보다 최신 기능 포함

**작업**:
1. Mobile을 Expo SDK 52로 다운그레이드
2. Mobile React Native 버전 조정 (0.76-0.78 범위)
3. Mobile React 19.1.0 → 18.3.1로 다운그레이드
4. Web은 18.3.1 유지 (또는 React 19에서 롤백)
5. Shared는 18.3.1 peer 유지 (또는 React 19에서 롤백)

---

## 📝 다음 조치

### 즉시 조치 (사용자 결정 필요):

1. **Expo SDK 버전 확인** ✅ 완료
   - 현재: Expo SDK 54.0.25
   - React Native: 0.81.5
   - 공식 React 버전: 19.1.0 (필수)

2. **전략 재결정**
   - **A안 (추천)**: Expo SDK 52 + React 18.3.1 다운그레이드
     - 장점: 라이브러리 완벽 호환, 안정적
     - 단점: Expo SDK 54 기능 일부 손실
     - 작업량: 1-2시간

   - **B안**: React 19 강행 (Expo SDK 54 유지)
     - 장점: 최신 SDK 기능 유지
     - 단점: 100+ TypeScript 에러, skipLibCheck 필요, 타입 안정성 상실
     - 작업량: 10분 (설정 변경) + 지속적인 불안정성

   - **C안**: 라이브러리 업데이트 대기
     - 장점: 장기적으로 올바른 해결
     - 단점: 작업 차단 (몇 주~몇 달)

---

## 🔗 참고 자료

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React Native Compatibility](https://reactnative.dev/blog)
- [Expo SDK Compatibility](https://docs.expo.dev/)

---

## 📌 결론

**현재 상황**: React 19로의 마이그레이션은 **라이브러리 호환성 문제**로 차단됨

**검증 완료** (2025-11-24):
- ✅ Expo SDK 54는 React 19.1.0 **필수**
- ✅ Expo SDK 52는 React 18 지원
- ❌ React 19 사용 시 100+ TypeScript 에러 발생

**권장사항**:
**A안 (추천)**: Expo SDK 52 + React 18.3.1로 다운그레이드
- 안정적이고 검증된 환경
- 모든 라이브러리 완벽 호환
- 즉시 개발 진행 가능

**사용자 결정 필요**:
- A안: Expo SDK 52 다운그레이드 (안정적)
- B안: React 19 강행 + skipLibCheck (위험)
- C안: 라이브러리 업데이트 대기 (작업 차단)

**대기 중**: 사용자 최종 결정
