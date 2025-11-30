# UI 가이드라인 (UI Guidelines)

> **작성일**: 2025-12-01
> **목적**: MandaAct의 웹(Web)과 모바일(Mobile) 애플리케이션에서 일관된 사용자 경험(UX)과 시각적 디자인(UI)을 유지하기 위한 통합 가이드라인.

---

## 1. 디자인 원칙 (Design Principles)

### 1.1 플랫폼 간 일관성 (Consistency)
MandaAct는 **Web First**로 디자인되었으나, **Mobile Native** 앱에서도 웹과 동일한 시각적 경험을 제공하는 것을 목표로 합니다.
- **목표**: Web과 Mobile의 UI 일치도 95% 이상 (A등급) 유지.
- **예외**: 네이티브 내비게이션(Tab Bar, Stack Header) 및 터치 인터랙션에 최적화된 패턴은 예외로 허용.

### 1.2 간결함 (Simplicity)
- 불필요한 장식을 배제하고 콘텐츠(만다라트, 목표)에 집중합니다.
- 여백(Spacing)을 충분히 활용하여 가독성을 높입니다.

---

## 2. Web vs Mobile 차이점 (Platform Differences)

웹과 모바일은 최대한 동일하게 유지하되, 플랫폼 특성에 따라 다음과 같은 차이를 둡니다.

| 구분 | Web (Desktop/Mobile Web) | Mobile (Native App) |
|------|--------------------------|---------------------|
| **Navigation** | 상단 GNB 또는 사이드바 | 하단 Tab Bar (Bottom Tabs) |
| **Modal Width** | `max-w-md` (448px) 고정 | 화면 너비 - 32px (`mx-4`) |
| **Grid Layout** | 반응형 (Desktop: 3열, Mobile: 1열) | 1열 (Vertical Scroll) |
| **Touch Target** | 마우스 호환 (최소 32px) | 터치 최적화 (최소 44px) |
| **Scroll** | 브라우저 기본 스크롤 | Native ScrollView / FlatList |
| **Icons** | `lucide-react` | `lucide-react-native` |

---

## 3. 컴포넌트 가이드라인 (Component Guidelines)

### 3.1 Card 컴포넌트

**기본 구조**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 콘텐츠 */}
  </CardContent>
</Card>
```

**패턴 (Patterns)**:

| 패턴 | 용도 | Padding | 예시 |
|------|------|---------|------|
| **Standard** | 일반적인 콘텐츠 | Header: `p-6`, Content: `p-6 pt-0` | 로그인, 회원가입 |
| **Compact** | 공간 절약 필요 시 | Header: `p-6 pb-4`, Content: `p-6 pt-0` | 설정 목록 |
| **Custom** | 그리드, 특수 레이아웃 | Header 없음, Content: `p-4` | 만다라트 그리드 |
| **Empty** | 데이터 없음 | Content: `py-12 text-center` | 리스트 없음 상태 |

**주의사항**:
- 모바일에서는 `Card`의 좌우 패딩을 줄이거나(`p-4`), 화면 꽉 차게(`mx-0`) 사용할 수 있습니다.
- `CardHeader`와 `CardContent` 사이의 이중 패딩을 피하기 위해 `CardContent`에는 `pt-0`을 기본으로 사용합니다.

### 3.2 Modal (Dialog) 컴포넌트

**너비 정책 (Width Policy)**:
- **Web**: `max-w-md` (448px)로 고정하여 너무 넓어지는 것을 방지.
- **Mobile**: 화면 좌우 16px 여백(`mx-4`)을 두어 꽉 차보이면서도 답답하지 않게 처리.

**구조 예시**:
```tsx
<DialogContent className="max-w-md mx-4 max-h-[80vh] overflow-y-auto">
  <DialogHeader>
    <DialogTitle>제목</DialogTitle>
    <DialogDescription>설명</DialogDescription>
  </DialogHeader>
  {/* 본문 */}
  <DialogFooter>
    <Button variant="outline">취소</Button>
    <Button>확인</Button>
  </DialogFooter>
</DialogContent>
```

**버튼 순서**:
- **우측 하단**: [취소] [확인] 순서 (Web/Mobile 공통)
- **모바일**: 전체 너비 버튼(`w-full`)을 사용할 경우 [확인]이 위, [취소]가 아래에 위치할 수 있음.

### 3.3 버튼 (Button)

- **Primary**: `bg-primary text-primary-foreground` (검정 배경, 흰 글씨)
- **Secondary**: `bg-secondary text-secondary-foreground` (회색 배경)
- **Outline**: `border border-input bg-background` (테두리만)
- **Ghost**: `hover:bg-accent` (배경 없음, 호버 시 배경)
- **Destructive**: `bg-destructive text-destructive-foreground` (빨강 배경)

---

## 4. 타이포그래피 (Typography)

| 역할 | 스타일 (Tailwind) | 크기/두께 |
|------|-------------------|-----------|
| **H1 (Page Title)** | `text-2xl font-bold tracking-tight` | 24px Bold |
| **H2 (Section)** | `text-xl font-semibold tracking-tight` | 20px SemiBold |
| **H3 (Card Title)** | `text-lg font-semibold leading-none` | 18px SemiBold |
| **Body** | `text-sm leading-relaxed` | 14px Regular |
| **Small / Hint** | `text-xs text-muted-foreground` | 12px Regular |

---

## 5. 색상 시스템 (Color System)

MandaAct는 `shadcn/ui`의 CSS Variable 기반 테마 시스템을 따릅니다.

- **Primary**: `#18181b` (Zinc 950) - 주요 액션, 헤더
- **Muted**: `#f4f4f5` (Zinc 100) - 배경, 비활성 요소
- **Accent**: `#f4f4f5` (Zinc 100) - 호버, 선택된 항목
- **Destructive**: `#ef4444` (Red 500) - 삭제, 위험 동작

**Red Color 정책**:
- 빨간색은 **파괴적인 액션(삭제)**이나 **치명적인 오류**에만 제한적으로 사용합니다.
- 단순 경고나 강조를 위해 빨간색 배경을 넓게 사용하는 것을 지양합니다. (아이콘이나 텍스트로만 표현)

---

## 6. 체크리스트 (Implementation Checklist)

새로운 UI를 구현할 때 다음을 확인하세요.

- [ ] **Web/Mobile 일치**: 웹과 모바일에서 동일한 룩앤필을 제공하는가?
- [ ] **반응형**: 모바일(`md:hidden`)과 데스크탑(`hidden md:block`) 레이아웃이 적절히 분기되었는가?
- [ ] **접근성**: 버튼과 입력 필드에 적절한 라벨(`aria-label`)과 포커스 스타일이 있는가?
- [ ] **다크 모드**: 색상이 CSS Variable(`bg-background`, `text-foreground`)을 사용하여 다크 모드에 대응하는가?
- [ ] **아이콘**: 이모지 대신 `lucide` 아이콘을 사용했는가?

---

## 7. 관련 문서 (Related Documents)

- **[Animation Guide](./ANIMATION_GUIDE.md)**: 애니메이션 및 트랜지션 가이드
- **[Notification Guidelines](./NOTIFICATION_GUIDELINES.md)**: 알림 메시지 및 UX 패턴
- **[Empty State Pattern](./EMPTY_STATE_PATTERN.md)**: 데이터가 없을 때의 UI 패턴
