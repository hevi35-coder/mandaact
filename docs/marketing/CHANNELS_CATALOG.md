# Channels Catalog (Dev / Productivity / AI)

> **Last updated**: 2025-12-21  
> 목적: “개발자 + 생산성 + AI” 유저가 모이는 채널을 정리하고, **자동 업로드(API)** 가능 여부와 **수익화(광고/구독/후원)** 가능성을 함께 판단한다.

## 1) 결론: 자동 업로드 가능한 채널(권장)

아래는 “게시글 업로드(Create)” 자동화가 **공식 API로 가능한** 채널들이다.

| Channel | Type | Audience Fit | Upload via API | Monetization (Ads/Revenue) | Notes |
|---|---|---:|---:|---|---|
| Dev.to | Dev blog/community | 높음(개발자) | ✅ | ❌ (플랫폼 내 광고/수익은 Dev.to 정책) | 이미 `scripts/publish_to_devto.js`로 자동 업로드 가능 |
| Hashnode | Dev blog/community | 높음(개발자) | ✅ (GraphQL) | ⚠️ (플랫폼 정책/플랜에 따라 다름) | `gql.hashnode.com` GraphQL `publishPost` 사용 |
| WordPress (self-host) | Owned blog | 중~높음(콘텐츠 품질에 따라) | ✅ (REST API) | ✅ (AdSense/직접 광고/후원/구독 등 자유) | 장기 SEO/브랜드 자산에 유리 |
| Ghost (self-host/Pro) | Owned blog/newsletter | 중~높음 | ✅ (Admin API) | ✅ (플랜/구성에 따라 광고/구독) | 뉴스레터/멤버십 운영에 강점 |
| Notion | Docs/landing publishing | 중(검색/커뮤니티는 약함) | ✅ (Create Page) | ❌ | “게시”는 Notion 공유/퍼블리시 정책 의존 |
| X (Twitter) | Social | 높음(빌드인퍼블릭/AI) | ✅ (API) | ⚠️ (API/플랜 비용/정책 제약) | 자동 포스팅은 스팸으로 오인될 수 있어 운영 주의 |

### Medium은?
- Medium 공식 API 문서에 **“The Medium API is no longer supported / no new integrations”** 경고가 명시되어 있음 → 자동 업로드 대상으로는 제외.  
  https://github.com/Medium/medium-api-docs

## 2) 국내 커뮤니티(대부분 수동 업로드 권장)

국내 커뮤니티는 dev.to처럼 “공식 글쓰기 API”를 외부에 공개하는 경우가 드물어, **수동 업로드 + 템플릿/버전관리 자동화**가 현실적이다.

| Channel | Audience Fit | Upload via API | Monetization | Notes |
|---|---:|---:|---|---|
| Disquiet(디스콰이엇) | 높음(메이커/프로덕트) | ❓(공식 public write API 확인 어려움) | ❌ | 메이커 로그/빌드스토리 톤이 강점 |
| OKKY | 높음(개발자) | ❓(공식 public write API 확인 어려움) | ❌ | 규칙/분위기 고려(과한 홍보보다 “문제/해결/배운점” 중심) |
| Velog | 높음(개발자) | ❓(공식 public write API 확인 어려움) | ❌ | 플랫폼 내 검색 유입/개발자 구독 강점 |
| 각종 오픈카톡/디스코드 | 중~높음(주제방) | ⚠️(봇/웹훅은 가능하나 커뮤니티 룰 주의) | ❌ | “1회 홍보”보다 “피드백/기여” 톤이 유리 |

## 3) 글로벌 커뮤니티(수동 업로드 중심 + 일부 API 가능)

| Channel | Audience Fit | Upload via API | Monetization | Notes |
|---|---:|---:|---|---|
| Product Hunt | 높음(제품 런칭) | ❓(공식 API는 있으나 런칭/제출 자동화는 제한될 수 있음) | ❌ | 런칭 당일 운영(댓글/업데이트)이 핵심 |
| Hacker News | 높음(개발자) | ❌(읽기 API 중심) | ❌ | “Show HN” 형식/톤 중요 |
| Reddit | 높음(생산성/자기계발/AI) | ⚠️(공식 API는 있으나 자동 홍보는 제재 위험) | ❌ | 서브레딧별 규칙 준수(가치 제공형 글 권장) |

## 4) 운영 원칙(스팸/제재 회피)

- “자동 업로드 가능”과 “자동 업로드가 적절”은 다름.
- 커뮤니티는 **수동 업로드 + 댓글 대응**이 핵심(자동화는 초안 생성/버전관리까지로 제한 권장).
- API 자동 업로드는 “Owned 채널(내 블로그/뉴스레터)”과 “Dev blog 플랫폼(dev.to/hashnode)”에 우선 적용.

