# Empty State Design Pattern

## 개요

사용자가 처음 기능에 접근하거나 아직 데이터가 없을 때 표시되는 빈 상태(Empty State) 화면의 디자인 패턴입니다. 이 패턴은 단순히 "데이터가 없습니다"라고 표시하는 대신, 사용자에게 기대감을 주고 다음 액션을 명확히 안내합니다.

**구현 예시**: 리포트 페이지 빈 상태 (2025-11-14)

## 핵심 원칙

### 1. 기대감 형성 (Expectation Setting)
- 미래에 제공될 기능/데이터의 미리보기를 보여줌
- 사용자가 "무엇을 얻을 수 있는지" 시각적으로 이해 가능
- 단순한 빈 화면이 아닌 가치 제안 전달

### 2. 명확한 안내 (Clear Guidance)
- 데이터/기능을 활성화하기 위해 필요한 단계를 명시
- 각 단계를 번호와 함께 순차적으로 표시
- 추상적인 설명 대신 구체적인 액션 항목 제시

### 3. 직접적인 액션 (Direct Action)
- 다음 단계로 바로 이동할 수 있는 버튼 제공
- 버튼 텍스트는 실제 가능한 액션 명시 (오해 유발 방지)
- 네비게이션 아이콘(→)으로 이동 의도 명확화

## 구현 패턴

### 기본 구조

```tsx
<div className="relative">
  {/* 1. 배경: 미리보기 콘텐츠 (흐릿하게) */}
  <motion.div className="pointer-events-none">
    <Card className="blur-[2px]">
      {/* 실제 데이터가 있을 때 표시될 콘텐츠 예시 */}
    </Card>
  </motion.div>

  {/* 2. 오버레이: 안내 카드 */}
  <motion.div className="absolute inset-0 flex items-center justify-center">
    <Card className="bg-background/95 backdrop-blur-sm border-2 shadow-xl">
      <CardContent>
        {/* 아이콘 */}
        {/* 메시지 */}
        {/* 진행 단계 */}
        {/* 액션 버튼 */}
      </CardContent>
    </Card>
  </motion.div>
</div>
```

### 1. 미리보기 배경 (Preview Background)

**목적**: 사용자에게 미래 화면에 대한 기대감 제공

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 0.3, y: 0 }}  // 30% 불투명도
  transition={{ duration: 0.5 }}
  className="pointer-events-none"    // 클릭 방지
>
  <Card className="blur-[2px]">     // Tailwind blur 효과
    {/* 실제 콘텐츠 구조와 동일한 목업 데이터 */}
    <CardHeader>
      <CardTitle>실제 기능 제목</CardTitle>
      <CardDescription>기능 설명</CardDescription>
    </CardHeader>
    <CardContent>
      <p>예시 데이터 1</p>
      <p>예시 데이터 2</p>
    </CardContent>
  </Card>
</motion.div>
```

**주요 속성**:
- `opacity: 0.3` - 충분히 흐릿하게 (배경임을 명확히)
- `blur-[2px]` - 가독성을 낮춰 주의를 오버레이로 유도
- `pointer-events-none` - 클릭 불가능하게 설정
- 실제 데이터 구조와 동일한 레이아웃 사용

### 2. 오버레이 카드 (Overlay Card)

**목적**: 현재 상태 설명 및 다음 액션 안내

```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, delay: 0.3 }}  // 배경 후 등장
  className="absolute inset-0 flex items-center justify-center p-4"
>
  <Card className="w-full max-w-md shadow-xl bg-background/95 backdrop-blur-sm border-2">
    <CardContent className="text-center py-8 space-y-5">
      {/* 콘텐츠 */}
    </CardContent>
  </Card>
</motion.div>
```

**주요 속성**:
- `bg-background/95` - 95% 불투명도 (뒤 배경 살짝 보임)
- `backdrop-blur-sm` - 배경 블러 효과로 깊이감
- `border-2` - 강조를 위한 두꺼운 테두리
- `shadow-xl` - 강한 그림자로 레이어 분리
- `max-w-md` - 과도하게 크지 않게 제한

### 3. 아이콘 영역

**목적**: 시각적 초점 제공 및 기능 상징화

```tsx
<div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
  <FileText className="h-8 w-8 text-primary" />
</div>
```

**주요 속성**:
- `bg-primary/10` - 브랜드 컬러의 연한 배경
- `rounded-full` - 원형으로 시선 집중
- 아이콘은 해당 기능을 상징하는 것 사용

### 4. 메시지 영역

**목적**: 현재 상태 설명 및 가능성 제시

```tsx
<div className="space-y-2">
  <p className="text-xl font-semibold">아직 리포트가 없어요</p>
  <p className="text-sm text-muted-foreground">
    만다라트를 만들고 실천을 시작하면<br />
    일주일 후부터 AI 리포트를 받을 수 있어요
  </p>
</div>
```

**작성 원칙**:
- 제목: 현재 상태를 부드럽게 설명 ("아직 ~가 없어요")
- 부제목: 조건과 타임라인을 구체적으로 제시
- 긍정적이고 희망적인 톤 유지
- 기술적 용어 대신 사용자 관점 언어 사용

### 5. 진행 단계 표시

**목적**: 사용자가 해야 할 일을 명확히 나열

```tsx
<div className="bg-muted/50 rounded-lg p-4 space-y-3 text-left">
  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
    리포트 생성을 위한 단계
  </p>
  <div className="space-y-2">
    <div className="flex items-center gap-3 text-sm">
      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs text-muted-foreground">1</span>
      </div>
      <span className="text-muted-foreground">만다라트 만들기</span>
    </div>
    <div className="flex items-center gap-3 text-sm">
      <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
        <span className="text-xs text-muted-foreground">2</span>
      </div>
      <span className="text-muted-foreground">매일 실천 기록하기</span>
    </div>
  </div>
</div>
```

**작성 원칙**:
- 2-4단계 정도가 적절 (너무 많으면 압도됨)
- 각 단계는 명확한 액션 동사로 시작
- 순차적 진행이 필요한 경우 번호 표시
- 배경색을 약하게 처리하여 분리

### 6. 액션 버튼

**목적**: 다음 단계로 즉시 이동 가능하게

```tsx
<Button
  onClick={() => navigate('/mandalart/list')}
  className="w-full"
  size="lg"
>
  만다라트 관리로 이동
  <ArrowRight className="h-4 w-4 ml-2" />
</Button>
```

**작성 원칙**:
- ❌ 나쁜 예: "첫 리포트 생성하기" (실제로 바로 생성 불가능)
- ✅ 좋은 예: "만다라트 관리로 이동" (실제 가능한 액션)
- 화살표 아이콘으로 이동 의도 명확화
- `size="lg"`로 주요 CTA임을 강조
- 전체 너비 버튼으로 모바일 UX 개선

## 애니메이션 타이밍

```tsx
// 1. 배경 미리보기 등장
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 0.3, y: 0 }}
  transition={{ duration: 0.5 }}  // 0.5초
>

// 2. 추가 배경 요소 (약간 지연)
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 0.3, y: 0 }}
  transition={{ duration: 0.5, delay: 0.1 }}  // +0.1초
>

// 3. 오버레이 카드 (배경 후)
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, delay: 0.3 }}  // +0.3초
>
```

**타이밍 원칙**:
- 배경 먼저, 오버레이 나중 (레이어 구조 인식)
- 전체 애니메이션은 1초 이내 완료
- scale + opacity 조합으로 부드러운 등장감

## 반응형 고려사항

### 모바일 (작은 화면)
```tsx
<motion.div className="absolute inset-0 flex items-center justify-center p-4">
  {/* p-4로 충분한 여백 확보 */}
  <Card className="w-full max-w-md">
    {/* max-w-md로 과도하게 크지 않게 */}
```

### 데스크톱 (큰 화면)
- 미리보기 카드가 여러 개일 경우 간격 유지 (`space-y-4`)
- 오버레이 카드는 중앙 정렬 유지
- 텍스트 크기는 동일하게 유지 (너무 크면 산만함)

## 적용 가능한 시나리오

### 1. 데이터 기반 기능 (Analytics, Reports)
- **미리보기**: 차트, 통계, 리포트 카드 예시
- **조건**: "데이터를 수집하면", "N일 후부터"
- **액션**: 데이터 생성 페이지로 이동

### 2. 컬렉션 기반 기능 (Lists, Galleries)
- **미리보기**: 빈 그리드/리스트 레이아웃
- **조건**: "항목을 추가하면"
- **액션**: 생성 페이지로 이동

### 3. 설정 필요 기능 (Integrations, Connections)
- **미리보기**: 연결된 상태의 UI
- **조건**: "연동을 완료하면"
- **액션**: 설정 페이지로 이동

## 안티패턴 (피해야 할 것)

### ❌ 오해를 유발하는 버튼
```tsx
// 나쁜 예: 실제로는 바로 생성 불가능한데 버튼이 그렇게 표현
<Button onClick={generate}>
  첫 리포트 생성하기
</Button>
```

### ❌ 추상적인 안내
```tsx
// 나쁜 예: 무엇을 해야 할지 불명확
<p>데이터를 준비해주세요</p>
```

### ❌ 미리보기 없는 빈 화면
```tsx
// 나쁜 예: 기대감 형성 실패
<Card>
  <p>아직 데이터가 없습니다</p>
  <Button>시작하기</Button>
</Card>
```

### ❌ 과도하게 복잡한 단계
```tsx
// 나쁜 예: 5개 이상의 단계는 압도적
<div>
  <p>1. 회원가입</p>
  <p>2. 프로필 설정</p>
  <p>3. 만다라트 생성</p>
  <p>4. 실천 항목 입력</p>
  <p>5. 매일 체크</p>
  <p>6. 7일 대기</p>
</div>
```

## 체크리스트

빈 상태 화면을 구현할 때 다음 항목들을 확인하세요:

- [ ] 미래 화면의 미리보기를 흐릿하게 배경에 표시했는가?
- [ ] 현재 상태를 부드럽게 설명하는 메시지가 있는가?
- [ ] 다음 단계가 2-4개의 명확한 항목으로 나열되어 있는가?
- [ ] 버튼 텍스트가 실제 가능한 액션을 정확히 표현하는가?
- [ ] 오버레이 카드가 시각적으로 충분히 강조되어 있는가?
- [ ] 애니메이션이 자연스럽고 1초 이내로 완료되는가?
- [ ] 모바일에서도 모든 요소가 잘 보이는가?
- [ ] 긍정적이고 희망적인 톤을 유지하는가?

## 참고 파일

- **구현 예시**: `src/components/stats/AIWeeklyReport.tsx` (line 210-347)
- **적용 날짜**: 2025-11-14
- **브랜치**: `feature/improve-empty-report-ux`
