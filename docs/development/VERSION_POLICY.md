# 버전 관리 정책 (Version Policy)

> **작성일**: 2025-12-01
> **상태**: 확정 (Locked)
> **목적**: React, Expo SDK 등 핵심 라이브러리의 버전을 명시하여 호환성 이슈 및 우발적인 버전 변경을 방지함.

---

## 1. 핵심 프레임워크 버전 (Core Frameworks)

이 프로젝트는 **Monorepo** 구조이며, `pnpm catalog` 기능을 통해 버전을 중앙 관리합니다.
모든 앱(`apps/*`)과 패키지(`packages/*`)는 아래 명시된 버전을 준수해야 합니다.

### 1.1 공통 (Shared)

| 패키지 | 버전 | 비고 |
|-------|------|------|
| **Node.js** | `20.x` | LTS 버전 권장 |
| **pnpm** | `9.x` | 패키지 매니저 |
| **React** | `18.3.1` | React 19 도입 전까지 동결 |
| **TypeScript** | `^5.9.2` | |

### 1.2 모바일 (Mobile - Expo)

**Expo SDK 52**를 기준으로 하며, React Native 버전은 Expo SDK 52 호환 버전을 엄격히 따릅니다.

| 패키지 | 버전 | 정책 |
|-------|------|------|
| **Expo SDK** | `~52.0.0` | Major 버전 변경 시 전체 마이그레이션 계획 수립 필수 |
| **React Native** | `0.76.1` | Expo SDK 52 호환 버전 (New Architecture Enabled) |
| **React** | `18.3.1` | React Native 0.76 호환 |

**주요 라이브러리 호환성 (SDK 52 기준):**
- `react-native-reanimated`: `~3.16.1`
- `react-native-gesture-handler`: `~2.20.2`
- `react-native-screens`: `~4.8.0`
- `react-native-safe-area-context`: `4.12.0`
- `expo-router` (사용 시): `~3.5.0`

### 1.3 웹 (Web - Vite)

| 패키지 | 버전 | 비고 |
|-------|------|------|
| **Vite** | `^5.4.3` | |
| **React** | `18.3.1` | 모바일과 동일 버전 유지 권장 |

---

## 2. 버전 관리 원칙

1.  **Catalog 사용 의무화**: `apps/mobile/package.json` 및 `apps/web/package.json`에서 직접 버전을 명시하지 않고, `catalog:` 프로토콜을 사용하여 `pnpm-workspace.yaml`에 정의된 버전을 참조합니다.
    ```json
    // ✅ Good
    "dependencies": {
      "react": "catalog:",
      "react-native": "catalog:"
    }
    
    // ❌ Bad
    "dependencies": {
      "react": "18.3.1"
    }
    ```

2.  **Lock 파일 동기화**: `pnpm-lock.yaml`은 항상 Git에 커밋되어야 하며, CI/CD 파이프라인에서는 `pnpm install --frozen-lockfile`을 사용하여 의존성 버전을 보장해야 합니다.

3.  **Expo Doctor 검사**: 모바일 빌드 전 반드시 `npx expo-doctor`를 실행하여 호환되지 않는 패키지가 없는지 확인합니다.

---

## 3. 주요 라이브러리 버전 (Snapshot)

*2025-12-01 기준 `pnpm-workspace.yaml` 설정값*

### State Management
- `zustand`: `^4.5.5`
- `@tanstack/react-query`: `^5.56.0`

### Backend & Utils
- `@supabase/supabase-js`: `^2.45.0`
- `date-fns`: `^3.6.0`
- `zod`: `^4.1.12`
- `react-hook-form`: `^7.65.0`

### Mobile UI
- `nativewind`: `^4.1.23` (Tailwind CSS for Native)
- `lucide-react-native`: `^0.469.0`

---

## 4. 버전 변경 절차 (Upgrade Process)

1.  **영향도 분석**: 변경할 패키지가 Web/Mobile 양쪽에 영향을 주는지 확인.
2.  **Catalog 업데이트**: `pnpm-workspace.yaml`의 `catalog` 섹션 수정.
3.  **로컬 테스트**:
    - Web: `pnpm dev:web` 실행 및 주요 기능 테스트.
    - Mobile: `pnpm dev:mobile` 실행 및 `npx expo-doctor` 통과 확인.
4.  **Lock 파일 갱신**: `pnpm install` 실행 후 `pnpm-lock.yaml` 커밋.
5.  **문서 업데이트**: 본 문서(`VERSION_POLICY.md`)의 버전 정보 갱신.

---

## 5. 관련 문서 (Related Documents)

- **[BUILD_GUIDE.md](./BUILD_GUIDE.md)**: 모바일 앱 빌드 가이드 (Expo SDK 호환성 확인)
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)**: pnpm workspace 초기 설정
- **[ROADMAP.md](../project/ROADMAP.md)**: 버전 업그레이드 계획 확인
