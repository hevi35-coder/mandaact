# MandaAct Mobile Assets Guide

앱 스토어 배포를 위한 아이콘/스플래시 에셋 가이드

## Required Assets

### 1. App Icon (`icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG (no transparency for iOS)
- **Usage**: iOS App Store, Android Play Store
- **Notes**:
  - iOS는 투명 배경 불가
  - 모서리 라운딩은 시스템에서 자동 적용

### 2. Adaptive Icon (`adaptive-icon.png`)
- **Size**: 1024x1024 pixels (foreground layer)
- **Format**: PNG with transparency
- **Usage**: Android adaptive icon
- **Notes**:
  - 배경색은 `#667eea` (app.json에서 설정)
  - 중앙 72% 영역에 주요 콘텐츠 배치

### 3. Splash Screen (`splash-icon.png`)
- **Size**: 1284x2778 pixels (전체) 또는 512x512 (아이콘만)
- **Format**: PNG
- **Background**: `#667eea` (app.json에서 설정)
- **Notes**:
  - resizeMode: "contain" 사용 시 아이콘만 필요
  - 중앙 정렬됨

### 4. Notification Icon (`notification-icon.png`)
- **Size**: 96x96 pixels
- **Format**: PNG with transparency
- **Usage**: Android notification icon
- **Notes**:
  - 단색 (흰색/회색)으로 디자인
  - 투명 배경 필수

### 5. Favicon (`favicon.png`)
- **Size**: 48x48 pixels
- **Format**: PNG
- **Usage**: Expo web build

## Store Assets (Not in repo)

### iOS App Store
| Asset | Size | Notes |
|-------|------|-------|
| Screenshots (6.5") | 1290x2796 | iPhone 14 Pro Max |
| Screenshots (5.5") | 1242x2208 | iPhone 8 Plus |
| App Preview | 1080x1920 | Video (optional) |

### Google Play Store
| Asset | Size | Notes |
|-------|------|-------|
| Feature Graphic | 1024x500 | Required |
| Screenshots | 1080x1920 | 최소 2장, 권장 8장 |
| Promo Video | YouTube URL | Optional |

## Brand Colors

```
Primary Gradient: #667eea → #764ba2
Primary: #667eea
Accent: #764ba2
Background: #f8fafc (light), #0f172a (dark)
```

## Design Files Location

디자인 소스 파일은 다음 위치에서 관리:
- Figma: [MandaAct Design System]
- 또는 `/design/` 폴더 (if local)

## Asset Generation Tools

```bash
# iOS 아이콘 생성 (1024x1024 소스에서)
npx expo-optimize

# 또는 EAS Build 시 자동 생성
eas build --platform ios --profile preview
```

## Checklist

- [ ] icon.png (1024x1024, no transparency)
- [ ] adaptive-icon.png (1024x1024, transparent)
- [ ] splash-icon.png (512x512+)
- [ ] notification-icon.png (96x96, monochrome)
- [ ] favicon.png (48x48)

## Notes

현재 placeholder 이미지가 적용되어 있습니다.
프로덕션 배포 전 실제 브랜드 에셋으로 교체 필요.
