# Hashnode Launch Guide (API Upload)

목표: Dev.to와 동일하게 “API로 업로드(Create)” 가능한 채널로 Hashnode를 추가한다.

## 1) 왜 Hashnode인가?

- 개발자 타겟이 강함(Dev.to와 유사)
- GraphQL 기반 Public API가 있어 자동 업로드 가능
- 커스텀 도메인/헤드리스 옵션을 통해 장기적으로 Owned 채널로 확장 가능

## 2) 준비물

- Hashnode 계정
- Publication 생성(개인 블로그 또는 팀 Publication)
- **Publication ID** (GraphQL `publishPost`에 필요)
- **Personal Access Token**(Authorization header에 사용)

> 토큰/ID는 민감 정보이므로 커밋 금지.

## 3) API 업로드 개요

Endpoint:
- `https://gql.hashnode.com` (GraphQL)

Mutation:
- `publishPost(input: PublishPostInput!)`

필수 필드:
- `title` (min length 제한 있음)
- `publicationId`
- `contentMarkdown`

## 4) 스크립트(예정)

Repo의 `scripts/` 하위에 Hashnode 업로드 스크립트를 추가하는 방식으로 운영한다(Dev.to와 동일).

- 스크립트: `scripts/publish_to_hashnode.js`
- 드래프트 소스: `docs/marketing/DEVTO_CONTENT_DRAFTS.md` (frontmatter의 `title`, `tags`, `canonical_url`, `cover_image`를 사용)

ENV 예시:

- `HASHNODE_TOKEN=...`
- `HASHNODE_PUBLICATION_ID=...`

실행:

- `node scripts/publish_to_hashnode.js`
