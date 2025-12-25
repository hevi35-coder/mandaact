# MandaAct Docs Index

이 문서는 `docs/` 하위의 문서들을 “어디에 무엇이 있는지” 빠르게 찾기 위한 인덱스입니다.

## Start Here (필독)

- `docs/development/SETUP_GUIDE.md`  
  개발 환경 최초 세팅(Supabase/외부 API 포함). 새로 온 팀원 온보딩의 1순위.
- `docs/development/DEVELOPMENT.md`  
  코드 스타일/구조/개발 규칙. 리팩토링/새 기능 추가 전 필독.
- `docs/development/BUILD_GUIDE.md`  
  빌드와 EAS Secrets 등 “실패하기 쉬운 지점”을 모은 실전 가이드.
- `docs/development/DEPLOYMENT_GUIDE.md`  
  Web(Vercel) + Mobile(EAS Build/Submit) 배포 절차의 기준 문서.
- `docs/troubleshooting/TROUBLESHOOTING.md`  
  자주 발생하는 장애/오류의 진단 절차. 운영/디버깅 시 참조.
- `docs/troubleshooting/SUBSCRIPTION_PURCHASE_NO_RESPONSE.md`  
  (모바일) 구독 플랜 탭 “무반응”처럼 보이는 케이스 진단/대응 기록.

## Product / Planning (제품/기획)

- `docs/project/PRD_mandaact.md`  
  제품 요구사항/화면/기능 정의(스펙의 소스 오브 트루스 역할).
- `docs/project/ROADMAP.md`  
  우선순위/단계별 계획과 관련 문서 링크의 허브.
- `docs/project/AI_MANDALART_COACHING_MILESTONE.md`  
  AI 만다라트 코칭 서비스의 스펙/정책/UX 마일스톤.
- `docs/project/AI_MANDALART_COACHING_EXECUTION_PLAN.md`  
  AI 만다라트 코칭 개발 로드맵/작업 로그/체크리스트.
- `docs/project/IMPROVEMENTS.md`  
  개선 과제 모음(백로그 성격). ROADMAP/PRD와 연결해서 관리 권장.

## Architecture (구조/결정 기록)

- `docs/architecture/XP_SERVICE_ARCHITECTURE.md`  
  XP 부여 로직을 앱 간 일관되게 만들기 위한 구조/선택 이유.
- `docs/architecture/XP_MOBILE_WEB_GAPS.md`  
  Web/Mobile 경험 차이 및 갭 정리(우선순위 결정에 유용).

## Feature Specs (도메인/기능 상세)

`docs/features/`는 기능 단위 상세 문서 모음입니다. 큰 변경 전 해당 도메인 문서를 먼저 확인하세요.

추천 진입점:
- `docs/features/PUSH_NOTIFICATION_POLICY.md`
- `docs/features/REPORT_GENERATION_POLICY.md`
- `docs/features/REPORT_COST_OPTIMIZATION.md`
- `docs/features/ADMOB_INTEGRATION.md`
- `docs/features/MONETIZATION_ANALYTICS_TAXONOMY.md`
- `docs/features/AI_COACHING_ANALYTICS.md`
- `docs/features/AI_COACHING_COST_LOGGING.md`
- `docs/features/AI_COACHING_DB_GAP_REPORT.md`
- `docs/features/AI_COACHING_SESSION_MODEL.md`
- `docs/features/AI_COACHING_CLIENT_SESSION_STORE.md`
- `docs/features/AI_COACHING_STEP_NAVIGATION.md`
- `docs/features/AI_COACHING_STEP_FLOW.md`
- `docs/features/AI_COACHING_CONTEXT_USAGE.md`
- `docs/features/AI_COACHING_ACTIONS_FLOW.md`
- `docs/features/AI_COACHING_SAVE_FLOW.md`
- `docs/features/AI_COACHING_DB_MIGRATION_DRAFT.md`
- `docs/features/BADGE_SYSTEM_V5_RENEWAL.md`
- `docs/features/XP_SYSTEM_PHASE2_COMPLETE.md`

## UX / UI Guidelines

- `docs/guidelines/UI_GUIDELINES.md`  
  UI 패턴/빈 상태/알림/애니메이션 가이드로 연결되는 허브.
- `docs/guidelines/EMPTY_STATE_PATTERN.md`
- `docs/guidelines/NOTIFICATION_GUIDELINES.md`
- `docs/guidelines/ANIMATION_GUIDE.md`

## Operations (운영/관측/백업)

- `docs/operations/PHASE8_SETUP_GUIDE.md`  
  PostHog/Sentry/CI 등 운영 구성 단계별 체크.
- `docs/operations/POSTHOG_DASHBOARD_SETUP.md`  
  PostHog에서 만들 대시보드/퍼널 세팅 가이드(리텐션/전환 운영용).
- `docs/operations/RETENTION_ANALYTICS.md`  
  리텐션 루프(온보딩→첫 성공→재방문→전환) 계측 기준 및 PostHog 퍼널/대시보드 초안.
- `docs/operations/BACKUP_RECOVERY_STRATEGY.md`  
  백업/복구 절차 및 운영 정책.

## Mobile (앱 품질/테스트)

- `docs/mobile/TESTING_GUIDE.md`  
  모바일 핵심 플로우 테스트 시나리오.
- `docs/development/DATE_TIME_FORMATTING.md`  
  (모바일) 날짜/시간 표기 규칙: locale + 유저 timezone 기준 통일.
- `docs/mobile/SETTINGS_IMPROVEMENTS.md`  
  설정 화면 개선 과제.

## Marketing / Store

- `docs/marketing/APP_STORE_METADATA.md`
- `docs/marketing/APP_STORE_SCREENSHOTS.md`
- `docs/marketing/SCREENSHOT_CAPTURE_GUIDE.md`
- `docs/marketing/CHANNELS_CATALOG.md`
- `docs/marketing/HASHNODE_LAUNCH_GUIDE.md`
- `docs/marketing/COMMUNITY_POST_TEMPLATES.md`
- `docs/marketing/PRIVACY_POLICY_PREP.md`
- `docs/development/STORE_DISTRIBUTION_PREP.md`

## Archive (참고/기록)

`docs/archive/`는 세션 로그/완료 문서/폐기 문서를 보관합니다. 현재 운영/개발의 기준 문서는 아닙니다.
