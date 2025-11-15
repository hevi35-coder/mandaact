# Card Component UI Guidelines

## 개요
Card 컴포넌트의 일관된 사용을 위한 가이드라인입니다. shadcn/ui의 Card 컴포넌트를 기반으로 프로젝트 전반에 걸쳐 일관성 있는 레이아웃과 스타일을 유지합니다.

---

## 1. Card 컴포넌트 구조

### 기본 구성요소
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 콘텐츠 */}
  </CardContent>
  <CardFooter>
    {/* 푸터 (선택사항) */}
  </CardFooter>
</Card>
```

### 기본 스타일
- **Card**: `rounded-xl border bg-card text-card-foreground shadow`
- **CardHeader**: `p-6` + `space-y-1.5`
- **CardContent**: `p-6 pt-0`
- **CardFooter**: `p-6 pt-0` + `flex items-center`

---

## 2. Width 정책

### **원칙: 모든 Card는 `w-full` 사용**

Card 컴포넌트는 항상 부모 컨테이너의 전체 너비를 차지하며, 부모가 최대 너비를 제어합니다.

```tsx
// ✅ 올바른 패턴
<div className="max-w-6xl mx-auto space-y-6">
  <Card className="w-full">
    {/* 내용 */}
  </Card>
</div>

// ❌ 잘못된 패턴
<div className="max-w-6xl mx-auto space-y-6">
  <Card>  {/* width 없음 */}
    {/* 내용 */}
  </Card>
</div>
```

### 예외 상황
인증 페이지(로그인/회원가입)처럼 Card 자체가 제한된 너비를 가져야 할 때:
```tsx
<Card className="w-full max-w-md">
  {/* 로그인 폼 */}
</Card>
```

---

## 3. Container 구조

### 페이지별 최대 너비 표준

| 페이지 유형 | 최대 너비 | 예시 |
|------------|----------|------|
| **폼/인증** | `max-w-md` (448px) | 로그인, 회원가입 |
| **설정/상세** | `max-w-lg` (512px) | 알림 설정 |
| **리스트/그리드** | `max-w-6xl` (1152px) | 만다라트 목록, 생성, 상세 |
| **대시보드** | `max-w-7xl` (1280px) | 통계 대시보드 |

### 표준 Container 패턴
```tsx
<div className="container mx-auto py-3 md:py-6 px-4">
  <div className="max-w-6xl mx-auto space-y-6">
    {/* 페이지 콘텐츠 */}
  </div>
</div>
```

---

## 4. Spacing 정책

### 페이지 레벨 Spacing
- **수직 간격**: `space-y-6` (24px) - Card 간 간격
- **수평 패딩**: `px-4` (16px) - 모바일 좌우 여백
- **수직 패딩**: `py-3 md:py-6` - 반응형 상하 여백

### Card 내부 Spacing
- **CardContent 내부**: `space-y-4` (16px) - 일반적인 요소 간격
- **폼 필드**: `space-y-2` (8px) - 밀접한 관계의 요소
- **섹션 구분**: `space-y-6` (24px) - 큰 구분이 필요할 때

```tsx
// ✅ 표준 패턴
<CardContent className="space-y-4">
  <div className="space-y-2">
    <Label>이름</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>이메일</Label>
    <Input />
  </div>
</CardContent>
```

---

## 5. 반응형 디자인

### 모바일 우선 접근
```tsx
// 모바일: 전체 너비, 데스크탑: 제한된 너비
<Card className="w-full md:max-w-2xl">

// 모바일에서 숨김
<Card className="hidden md:block w-full">

// 모바일에서만 표시
<Card className="md:hidden w-full">
```

### CardHeader 패딩 조정
```tsx
// 모바일에서 패딩 줄이기
<CardHeader className="pb-4">  {/* 기본 pb-6 → pb-4 */}
```

---

## 6. 컴포넌트 재사용성

### Fragment 패턴 (권장)
컴포넌트가 여러 Card를 반환할 때, 불필요한 wrapper div 제거:

```tsx
// ✅ 올바른 패턴 (Fragment)
function MyComponent() {
  return (
    <>
      {error && <ErrorMessage />}
      {!inputMethod && <Card>...</Card>}
      {inputMethod === 'image' && <Card>...</Card>}
      {inputMethod === 'text' && <Card>...</Card>}
    </>
  )
}

// 부모에서 spacing 제어
<div className="space-y-6">
  <MyComponent />
</div>
```

```tsx
// ❌ 잘못된 패턴 (중복 wrapper)
function MyComponent() {
  return (
    <div className="space-y-4">  {/* 불필요한 wrapper */}
      <Card>...</Card>
    </div>
  )
}
```

### 장점
- 불필요한 DOM 노드 제거
- 부모가 레이아웃 완전 제어
- 컴포넌트 재사용성 향상
- React Best Practice

---

## 7. 스타일 커스터마이징

### CardHeader 변형
```tsx
// 제목과 아이콘
<CardHeader>
  <CardTitle className="text-base flex items-center gap-2">
    <Icon className="h-5 w-5 text-primary" />
    제목
  </CardTitle>
  <CardDescription>설명</CardDescription>
</CardHeader>

// 제목과 액션 버튼
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>제목</CardTitle>
    <Button variant="ghost" size="sm">편집</Button>
  </div>
</CardHeader>
```

### CardContent 변형
```tsx
// 기본 패딩 재정의
<CardContent className="p-4">  {/* 기본 p-6 → p-4 */}

// 패딩 제거 (그리드/리스트)
<CardContent className="p-0">

// 수직 패딩만 조정
<CardContent className="py-8">  {/* 기본 pt-0 재정의 */}
```

---

## 8. 상호작용 스타일

### 클릭 가능한 Card
```tsx
<Card
  className="hover:shadow-md transition-shadow cursor-pointer"
  onClick={handleClick}
>
  {/* 내용 */}
</Card>
```

### 비활성 상태
```tsx
<Card className={`${!isActive ? 'opacity-60' : ''}`}>
  {/* 내용 */}
</Card>
```

### 선택된 상태
```tsx
<Card className={`transition-all ${
  isSelected
    ? 'bg-blue-50 border-blue-200'
    : 'bg-white'
}`}>
  {/* 내용 */}
</Card>
```

---

## 9. Empty State 패턴

```tsx
<Card>
  <CardContent className="py-12 text-center space-y-4">
    <div className="text-6xl">📝</div>
    <div>
      <p className="text-lg font-medium">데이터가 없습니다</p>
      <p className="text-sm text-muted-foreground mt-1">
        설명 메시지
      </p>
    </div>
    <Button>액션 버튼</Button>
  </CardContent>
</Card>
```

---

## 10. 체크리스트

Card 컴포넌트를 사용할 때 확인사항:

- [ ] Card에 `w-full` 클래스 추가했는가?
- [ ] 부모 Container에 적절한 `max-w-*` 설정했는가?
- [ ] 페이지 레벨에서 `space-y-6` 사용했는가?
- [ ] CardContent 내부에서 `space-y-4` 사용했는가?
- [ ] 컴포넌트가 여러 Card 반환 시 Fragment 사용했는가?
- [ ] 모바일 반응형 처리했는가?
- [ ] 불필요한 wrapper div가 없는가?

---

## 버전 히스토리

### v1.0 (2025-11-11)
- 초기 가이드라인 작성
- Width 정책 확립: 모든 Card는 `w-full`
- Container 구조 표준화: 페이지별 `max-w-*`
- Fragment 패턴 권장: 불필요한 wrapper 제거
- Spacing 정책 정립: `space-y-6` (페이지), `space-y-4` (Card 내부)
