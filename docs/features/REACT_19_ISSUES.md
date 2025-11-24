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

### 1️⃣ Expo Go 호환성 재확인

**확인 필요**:
```bash
# Expo Go가 정말 React 19만 지원하는가?
# React Native 0.81.5의 공식 React 버전은?
```

### 2️⃣ React 18.3.1로 롤백 (추천)

**이유**:
- Expo SDK 54는 React Native 0.76을 사용
- RN 0.76은 React 18.2.0을 공식 지원
- RN 0.81은 아직 베타/불안정

**작업**:
1. Mobile을 React 18.3.1로 다운그레이드
2. Web은 이미 18.3.1 (유지)
3. Shared는 18.3.1 peer (유지)
4. React Native를 0.76.5로 변경

---

## 📝 다음 조치

### 즉시 조치 (사용자 확인 필요):

1. **Expo Go 버전 확인**
   - Expo SDK 버전은?
   - React Native 버전은?
   - 공식 React 지원 버전은?

2. **전략 재결정**
   - **A안**: React 18.3.1 유지 (안정적)
   - **B안**: React 19 강행 (위험)

---

## 🔗 참고 자료

- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [React Native Compatibility](https://reactnative.dev/blog)
- [Expo SDK Compatibility](https://docs.expo.dev/)

---

## 📌 결론

**현재 상황**: React 19로의 마이그레이션은 **라이브러리 호환성 문제**로 차단됨

**사용자 결정 필요**:
1. Expo Go가 정말 React 19만 지원하는지 확인
2. React 18.3.1로 롤백 vs React 19 강행 결정

**대기 중**: 사용자 피드백
