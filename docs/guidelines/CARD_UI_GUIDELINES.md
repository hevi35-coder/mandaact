# Card UI Component Guidelines

MandaAct 프로젝트의 Card 컴포넌트 사용 가이드라인

> **작성일**: 2025-11-12
> **목적**: 전체 애플리케이션에서 일관된 Card UI 패턴 유지

---

## 목차

1. [Card 컴포넌트 기본 구조](#card-컴포넌트-기본-구조)
2. [표준 패턴 (Patterns)](#표준-패턴-patterns)
3. [반응형 디자인 가이드](#반응형-디자인-가이드)
4. [패턴 선택 가이드](#패턴-선택-가이드)
5. [실제 사용 예시](#실제-사용-예시)
6. [안티 패턴 (피해야 할 것)](#안티-패턴-피해야-할-것)

---

## Card 컴포넌트 기본 구조

### 컴포넌트 종류

```tsx
import {
  Card,           // 카드 컨테이너
  CardHeader,     // 헤더 영역 (기본 p-6, space-y-1.5)
  CardTitle,      // 제목 (font-semibold leading-none tracking-tight)
  CardDescription,// 설명 텍스트 (text-sm text-muted-foreground)
  CardContent,    // 본문 영역 (기본 p-6 pt-0)
  CardFooter      // 푸터 영역 (기본 p-6 pt-0)
} from '@/components/ui/card'
```

### 기본 Padding 값

| 컴포넌트 | 기본 Padding | 설명 |
|---------|-------------|------|
| CardHeader | `p-6` + `space-y-1.5` | 전체 24px, 자식 간격 6px |
| CardContent | `p-6 pt-0` | 좌우하단 24px, 상단 0 |
| CardFooter | `p-6 pt-0` | 좌우하단 24px, 상단 0 |

---

## 표준 패턴 (Patterns)

### Pattern 1: Standard Card (표준 카드)

**사용 케이스**: 일반 콘텐츠 카드, 폼, 대부분의 표준 UI

```tsx
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명 텍스트</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* 콘텐츠 */}
  </CardContent>
</Card>
```

**특징**:
- ✅ 모든 기본 padding 유지
- ✅ `space-y-4`로 콘텐츠 내부 간격 조정
- ✅ 가장 일반적인 패턴 (전체의 ~75%)

**예시**: LoginPage, SignUpPage, AIInsightCard, StreakHero

---

### Pattern 2: Compact Header (컴팩트 헤더)

**사용 케이스**: 헤더와 콘텐츠 사이 간격을 줄이고 싶을 때

```tsx
<Card>
  <CardHeader className="pb-4">
    <CardTitle>제목</CardTitle>
    <CardDescription>설명 텍스트</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4 pt-0">
    {/* 콘텐츠 */}
  </CardContent>
</Card>
```

**특징**:
- ✅ CardHeader 하단 padding 축소 (24px → 16px)
- ✅ CardContent 상단 padding 제거
- ✅ 시각적으로 타이트한 레이아웃
- ✅ 전체의 ~15% 사용

**예시**: UserProfileCard, NotificationSettingsPage, InputMethodSelector

---

### Pattern 3: Custom Header (커스텀 헤더)

**사용 케이스**: 최소 여백이 필요하거나, 특수한 레이아웃이 필요할 때

```tsx
<Card>
  <div className="p-6 pb-3">
    <h3 className="font-semibold leading-none tracking-tight">제목</h3>
    <p className="text-sm text-muted-foreground mt-1.5">설명 텍스트</p>
  </div>
  <CardContent className="pt-0">
    {/* 콘텐츠 */}
  </CardContent>
</Card>
```

**특징**:
- ✅ CardHeader 컴포넌트를 사용하지 않음
- ✅ 완전한 padding 커스터마이징 가능
- ✅ 최소 여백 확보 (모바일 최적화)
- ✅ 전체의 ~5% 사용

**모바일 변형**:
```tsx
<div className="p-4 pb-2">  {/* 더 타이트한 모바일 여백 */}
  <h3 className="font-semibold leading-none tracking-tight">제목</h3>
  <p className="text-sm text-muted-foreground mt-1.5">설명</p>
</div>
<CardContent className="p-4 pt-0">
```

**예시**: MandalartCreatePage (Desktop/Mobile)

---

### Pattern 4: Headerless (헤더 없음)

**사용 케이스**: 헤더가 불필요한 단순 콘텐츠, Empty State, 리스트 아이템

```tsx
<Card>
  <CardContent className="p-6">  {/* 또는 py-12, p-4 등 */}
    {/* 콘텐츠만 */}
  </CardContent>
</Card>
```

**특징**:
- ✅ 헤더 컴포넌트 없음
- ✅ Padding 자유 조정 가능
- ✅ Empty State는 `py-12` + `text-center` 표준
- ✅ 전체의 ~10% 사용

**예시**:
- Empty State: `className="py-12 text-center space-y-4"`
- Grid Container: `className="p-6"` (Desktop), `className="p-4"` (Mobile)
- List Items: `className="p-4"`

---

## 반응형 디자인 가이드

### Desktop vs Mobile Padding

| 컨텍스트 | Desktop | Mobile | 비고 |
|---------|---------|--------|------|
| 일반 콘텐츠 | `p-6` | `p-6` | 동일 유지 |
| 그리드/레이아웃 | `p-6` | `p-4` | 모바일 축소 |
| 헤더 (커스텀) | `p-6 pb-3` | `p-4 pb-2` | 모바일 더 타이트 |
| Empty State | `py-12` | `py-12` | 동일 유지 |

### 반응형 패턴 예시

```tsx
{/* Desktop */}
<Card className="hidden md:block">
  <div className="p-6 pb-3">
    <h3>제목</h3>
    <p className="mt-1.5">설명</p>
  </div>
  <CardContent className="pt-0">
    {/* Desktop 그리드 */}
  </CardContent>
</Card>

{/* Mobile */}
<Card className="md:hidden">
  <div className="p-4 pb-2">
    <h3>제목</h3>
    <p className="mt-1.5">설명</p>
  </div>
  <CardContent className="p-4 pt-0">
    {/* Mobile 그리드 */}
  </CardContent>
</Card>
```

---

## 패턴 선택 가이드

### 의사결정 플로우

```
카드가 필요한가?
  ├─ 헤더가 필요한가?
  │   ├─ YES → 헤더와 콘텐츠 간격은?
  │   │   ├─ 표준 간격 → Pattern 1 (Standard)
  │   │   ├─ 타이트한 간격 → Pattern 2 (Compact Header)
  │   │   └─ 최소 간격 → Pattern 3 (Custom Header)
  │   └─ NO → Pattern 4 (Headerless)
  └─ 특수 케이스 (Empty State, List Item, etc.)
```

### 상황별 권장 패턴

| 상황 | 권장 패턴 | 이유 |
|-----|---------|------|
| 로그인/회원가입 폼 | Pattern 1 | 표준 간격이 가독성 좋음 |
| 설정 페이지 | Pattern 2 | 많은 옵션을 컴팩트하게 표시 |
| 그리드 레이아웃 (모바일) | Pattern 3 | 공간 최대한 활용 |
| Empty State | Pattern 4 | 헤더 불필요, 중앙 정렬 |
| 리스트 아이템 | Pattern 4 | 반복 요소에 헤더 불필요 |
| Dashboard 카드 | Pattern 1 or 2 | 콘텐츠 양에 따라 선택 |

---

## 실제 사용 예시

### 예시 1: 로그인 폼 (Pattern 1)

```tsx
// src/pages/LoginPage.tsx
<Card>
  <CardHeader>
    <CardTitle>로그인</CardTitle>
    <CardDescription>계정 정보를 입력하세요</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <Input type="email" placeholder="이메일" />
    <Input type="password" placeholder="비밀번호" />
    <Button>로그인</Button>
  </CardContent>
  <CardFooter className="flex flex-col space-y-4">
    <Link to="/signup">회원가입</Link>
  </CardFooter>
</Card>
```

### 예시 2: 알림 설정 (Pattern 2)

```tsx
// src/pages/NotificationSettingsPage.tsx
<Card>
  <CardHeader className="pb-4">
    <CardTitle>알림 권한</CardTitle>
    <CardDescription>브라우저 알림 설정</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4 pt-0">
    <Switch checked={enabled} onCheckedChange={setEnabled} />
    <p className="text-sm">알림을 받으시겠습니까?</p>
  </CardContent>
</Card>
```

### 예시 3: 만다라트 그리드 - 모바일 (Pattern 3)

```tsx
// src/pages/MandalartCreatePage.tsx (Mobile)
<Card className="md:hidden">
  <div className="p-4 pb-2">
    <h3 className="font-semibold leading-none tracking-tight">직접 입력</h3>
    <p className="text-sm text-muted-foreground mt-1.5">
      셀을 탭하여 목표와 실천 항목을 입력하세요
    </p>
  </div>
  <CardContent className="p-4 pt-0">
    <div className="grid grid-cols-3 gap-2">
      {/* 9x9 그리드 */}
    </div>
  </CardContent>
</Card>
```

### 예시 4: Empty State (Pattern 4)

```tsx
// src/pages/TodayChecklistPage.tsx
<Card>
  <CardContent className="py-12 text-center space-y-4">
    <div className="flex justify-center">
      <CheckCircle2 className="h-16 w-16 text-muted-foreground" />
    </div>
    <div>
      <h3 className="text-lg font-semibold">아직 실천 항목이 없습니다</h3>
      <p className="text-sm text-muted-foreground">
        만다라트를 생성하여 목표를 설정하세요
      </p>
    </div>
    <Button onClick={() => navigate('/mandalart/create')}>
      만다라트 만들기
    </Button>
  </CardContent>
</Card>
```

---

## 안티 패턴 (피해야 할 것)

### ❌ 안티 패턴 1: 불일치한 padding

```tsx
// BAD: CardHeader는 기본값, CardContent는 커스텀
<CardHeader>  {/* p-6 */}
  <CardTitle>제목</CardTitle>
</CardHeader>
<CardContent className="p-4">  {/* ⚠️ pt-0 누락 */}
```

**문제**: 헤더와 콘텐츠 사이 이중 padding 발생
**해결**: `pt-0` 추가 또는 Pattern 2/3 사용

---

### ❌ 안티 패턴 2: 중복된 wrapper

```tsx
// BAD: Card 안에 불필요한 wrapper div
<Card>
  <div className="p-6">  {/* ⚠️ 불필요 */}
    <CardContent>
      {/* 콘텐츠 */}
    </CardContent>
  </div>
</Card>
```

**문제**: 불필요한 중첩으로 padding 중복
**해결**: CardContent 직접 사용

---

### ❌ 안티 패턴 3: 반응형 고려 없음

```tsx
// BAD: 모바일에서도 Desktop padding 사용
<Card>
  <CardHeader className="p-6">  {/* ⚠️ 모바일에서 너무 큼 */}
    <CardTitle>제목</CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    <div className="grid grid-cols-3">
      {/* 모바일 그리드 - 공간 부족 */}
    </div>
  </CardContent>
</Card>
```

**문제**: 모바일에서 공간 낭비
**해결**: 반응형 padding 적용 (Pattern 3 참고)

---

### ❌ 안티 패턴 4: 패턴 혼용

```tsx
// BAD: 동일 페이지에서 다른 패턴 혼용
<Card>
  <CardHeader className="pb-4">  {/* Pattern 2 */}
    <CardTitle>카드 1</CardTitle>
  </CardHeader>
  <CardContent className="pt-0">...</CardContent>
</Card>

<Card>
  <CardHeader>  {/* Pattern 1 */}
    <CardTitle>카드 2</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**문제**: 시각적 불일치
**해결**: 동일 페이지/컨텍스트에서는 동일 패턴 사용

---

## 체크리스트

카드 컴포넌트 사용 전 확인사항:

- [ ] 적절한 패턴을 선택했는가?
- [ ] 반응형 디자인을 고려했는가?
- [ ] CardHeader와 CardContent의 padding이 일치하는가?
- [ ] 동일 페이지의 다른 카드와 일관성이 있는가?
- [ ] Empty State는 `py-12 text-center` 패턴을 따르는가?
- [ ] 모바일 그리드는 `p-4` padding을 사용하는가?
- [ ] 불필요한 wrapper div가 없는가?

---

## 참고 자료

- **Card 컴포넌트 정의**: `src/components/ui/card.tsx`
- **실제 사용 예시**:
  - Pattern 1: `src/pages/LoginPage.tsx`, `src/pages/SignUpPage.tsx`
  - Pattern 2: `src/pages/NotificationSettingsPage.tsx`, `src/components/UserProfileCard.tsx`
  - Pattern 3: `src/pages/MandalartCreatePage.tsx`
  - Pattern 4: `src/pages/TodayChecklistPage.tsx` (Empty State)

---

## 변경 이력

### 2025-11-12
- ✅ 초기 가이드라인 작성
- ✅ MandalartCreatePage Card UI 통일성 개선 (Pattern 3 적용)
- ✅ 4가지 표준 패턴 정의
- ✅ 반응형 디자인 가이드 추가
- ✅ 안티 패턴 문서화

---

**마지막 업데이트**: 2025-11-12
**문서 버전**: 1.0.0
