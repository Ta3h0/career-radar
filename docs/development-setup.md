# 2단계 개발환경 구축 결과

검증일: 2026-10-14 (Asia/Seoul). 실제 실행 결과만 기록한다. 자동 수집·분석·저장·메일·예약·배포 기능은 구현하지 않았다.

## 기존 상태와 보존

초기 루트는 `.agents/`, `docs/`, `.gitignore`, `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`였다. 전체 파일 목록과 작업 전 SHA-256은 로컬 `.setup/initial-tree.txt`, `.setup/baseline.json`에 보관했다. 프로젝트에 package.json과 .git은 없었다. 별도 하위 AGENTS.md도 없었다.

스킬 7개: `ui-ux-pro-max`, `ui-styling`, `design-system`, `brand`, `design`, `banner-design`, `slides`. 기존 172개 스킬 파일과 모든 고지는 SHA-256 비교에서 변경되지 않았다. 화면의 접근성·모바일 재배치·토큰 구성에 로컬 ui-styling/design-system 지침을 적용했다. 스킬 내 1단계 제한 문구는 이번 사용자 요청과 갱신된 AGENTS.md보다 우선하지 않는다. 스킬을 추가 복제·설치하지 않았다. 스킬 스크립트 전체 재검증은 이번 범위에서 실행하지 않았다.

원격 README만 존재해 로컬 기존 파일과 충돌하지 않았다. 최신 create-vite 9.2.1로 `.setup/vite-template`에 React TS 템플릿을 생성한 뒤 필요한 구성을 작성했다. 템플릿의 Oxlint 대신 요청된 ESLint를 구성하고 샘플 이미지·카운터·추가 UI 라이브러리를 도입하지 않았다.

## 실제 버전과 설치

| 도구 | 확인·설치 결과 |
|---|---|
| Git | 2.52.0.windows.1, 기존 설치 사용 |
| 기존 시스템 Node / npm | 25.2.1 / 11.6.2, 시스템 설치 보존 |
| 프로젝트 Node LTS / npm | 24.21.0 Krypton / 11.19.0, `.tools`에 프로젝트 전용 설치 |
| React / React DOM | 19.3.0 |
| TypeScript | 6.0.3 |
| Vite / React 플러그인 | 8.3.4 / 6.1.2 |
| ESLint / typescript-eslint | 10.12.0 / 8.71.2 |
| Vitest | 5.0.4 |

공식 [Node 배포 목록](https://nodejs.org/dist/index.json)에서 Node 24 LTS를 선택했고 공식 `SHASUMS256.txt`와 ZIP SHA-256 일치를 검사한 후 압축을 풀었다. 설치한 Node의 LICENSE도 `.tools`에 유지한다. [Vite 요구사항](https://vite.dev/guide/)과 [Vitest 요구사항](https://vitest.dev/guide/)을 확인했다. 시스템 PATH는 영구 수정하지 않았다.

`npm install --no-fund`: 176개 패키지 추가, 총 177개 audit, 취약점 0개. 이는 설치 시점 audit 결과이며 미래 안전성 보증은 아니다. 정확한 전이 의존성은 package-lock.json에 기록했다. 재설치는 `./scripts/npm.ps1 ci`를 사용한다.

## 생성·수정 파일과 구조

```text
career-radar/
├─ .gitignore, .node-version, .npmrc
├─ AGENTS.md, PRODUCT.md, DESIGN.md, README.md
├─ package.json, package-lock.json
├─ tsconfig.json, tsconfig.app.json, tsconfig.node.json
├─ eslint.config.js, vite.config.ts, vitest.config.ts, index.html
├─ src/
│  ├─ main.tsx, App.tsx
│  ├─ domain/{jobs.ts,profile.ts,analysis.ts,jobs.test.ts}
│  ├─ features/dashboard/{Dashboard.tsx,Dashboard.test.tsx}
│  ├─ components/DataState.tsx
│  └─ styles/{tokens.css,global.css}
├─ server/
│  ├─ collectors/contracts.ts
│  └─ pipeline/contracts.ts
├─ scripts/{npm.ps1,check-publish.mjs}
├─ docs/
│  ├─ architecture.md
│  ├─ license-boundary.md, development-setup.md
│  ├─ licenses/nextlevelbuilder-MIT.txt (기존 보존)
│  └─ skill-migration.md, skill-migration-manifest.json,
│     skill-validation.json (로컬 전용, 기존 보존)
├─ .agents/skills/ (7개, 로컬 전용·보존)
├─ .tools/ (검증한 Node LTS, Git 제외)
└─ .setup/ (템플릿·원격 검사·해시·화면 검증, Git 제외)
```

기존 문서 중 AGENTS.md·PRODUCT.md·DESIGN.md·architecture.md는 2단계 상태와 경계를 갱신했다. README는 원격의 기존 제목을 보존하며 실행 안내를 추가했다. .gitignore는 생성물·스킬·로컬 이전 증거 제외를 추가했다. 라이선스 원문과 이전 검증 자료는 수정하지 않았다.

모델은 API 미제공 필드를 null로 구분하며 프로필에는 연락처나 이력서를 넣지 않는다. 분석 완료 타입은 근거·누락 정보·신뢰도 사유·시각·모델/프롬프트/규칙 버전을 요구한다. `parseJobIdentity`만 최소 런타임 경계 예제로 구현했으며 전체 API/프로필/AI 응답 검증기는 아직 없다. 중복 제거·필터·분석 검증·수집은 인터페이스뿐이다. 자동화의 수행 순서는 수집 → 검증·정규화 → 중복 제거 → 필터 → 무료 분석 → 근거 검증 → 저장 → 동의 기반 outbox다.

## 실제 통과한 검증

아래 npm 명령은 프로젝트 LTS를 쓰도록 `./scripts/npm.ps1` 래퍼로 실행했다.

| 검증 | 결과 |
|---|---|
| `npm run dev` | 127.0.0.1:5173, Vite ready 261ms, 브라우저 HTTP 200 |
| `npm run typecheck` | tsc -b 통과, 앱·공유 타입·서버 계약·설정·테스트 strict 검사 |
| `npm run lint` | ESLint 오류·경고 0. 초기 Node 스크립트 globals 누락을 수정한 뒤 재실행 통과 |
| `npm run build` | 타입 검사 + Vite 프로덕션 빌드 통과 |
| `npm test` | 2개 파일, 11개 테스트 통과 |
| `npm run check:publish` | 추적/공개 후보의 파일 경로·대표 비밀/개인정보 패턴 검사 통과 |
| `git diff --check` | 공백 오류 없음 |
| `git status`, `git remote -v`, `git rev-parse HEAD origin/main` | 원격 연결·main 추적, 같은 HEAD 확인 |

Vitest는 공식 출처 식별자의 정상·누락·타입 오류·미지원 출처·추가 필드 제거와 대시보드의 미구현 상태 표시를 검사한다. 수집·필터·분석·알림 동작 테스트가 통과한 것으로 해석하지 않는다.

기존 번들 Playwright + Edge headless로 1440/1024/768/390px 브라우저를 실제 실행했다. 각 폭의 HTTP 200·가로 넘침 없음·Tab으로 건너뛰기 링크 초점·Enter로 main 이동·초점 외곽선 표시를 확인하고 네 캡처를 시각 확인했다. 브라우저 실행 오류 0, 외부 네트워크 요청 0. `.setup/browser-check.json`과 `viewport-*.png`에 로컬 증거를 보관한다. 문서·서버·스킬·런타임·검증 증거 대표 경로 5개는 HTTP 403을 확인했다. 이는 전체 제품 접근성 심사를 대신하지 않는다.

## GitHub 연결·공개 범위

사용자 제공 [Ta3h0/career-radar](https://github.com/Ta3h0/career-radar)는 GitHub CLI 확인 결과 **공개**, 기본 브랜치 main, 빈 저장소가 아니다. 원격 검사용 clone으로 트리를 먼저 확인한 후 .git 부재를 재확인하고 init → origin 등록 → fetch → origin/main 추적 순서로 연결했다.

초기 구축 완료 시점에는 원래 커밋 `4be77a1` 및 `099b1b1559fca9054a0534d5392ac6c5c492dca4`를 보존하고 새 커밋·스테이징·푸시를 하지 않았다. 이후 사용자가 같은 날 공개 반영을 요청했으며 아래 공개 반영 절차를 따른다. force push는 하지 않는다.

스킬 7개, 이전 보고서/manifest/검증 JSON, 런타임·임시 증거·node_modules·dist는 Git 제외를 확인했다. 기존 고지를 유지하며 불확실한 권리의 공개를 막는 경계는 [license-boundary.md](license-boundary.md)를 따른다. 앱 코드의 공개 라이선스는 미결정이다. 키·비밀번호·이메일·이력서·실제 사용자 프로필은 입력하거나 생성하지 않았다. 패턴 검사와 실제 변경 파일 검토 범위에서 민감정보를 발견하지 않았다.

## 남은 문제와 다음 자동화 개발

환경 구축을 막는 문제는 없다. ui-styling MIT/Apache 충돌, 다른 스킬의 원본 revision/개별 고지, 앱 라이선스는 미해결이다. 스킬 전체를 로컬로 제외했으므로 이 문제를 해결했다고 주장하지 않는다.

다음 단계는 사용자 조건과 공식 API 승인·약관·쿼터·허용 필드부터 확인한다. 이어 합성 입력으로 API 정규화 경계·출처별 멱등 upsert·출처 간 중복 후보 보존·필수/희망/미확인 필터를 구현하고 테스트한다. 승인 후 공식 API 수집기를 연결하며, 이후 무료 AI 정책·동의·한도와 근거 검증, 저장·예약 잠금·체크포인트·제한된 재시도, 동의 기반 알림 outbox를 차례로 구현한다. DB·호스팅·스케줄러·메일 무료 환경은 아직 선정하지 않았다.

이번 단계에서 실제 채용 API·AI API·이메일 호출, 승인되지 않은 스크래핑, 유료 서비스·과금 연결, 배포·예약 자동화는 실행하지 않았다. Node/npm 패키지 다운로드와 사용자 지정 GitHub 읽기만 개발환경 준비에 사용했다.

## GitHub 공개 반영 절차 (2026-10-14)

사용자의 명시적 요청에 따라 origin/main을 fetch해 기존 HEAD와 같은 이력이며 추가 원격 변경이 없음을 확인했다. 앱·설정·테스트·공개 문서 35개 파일을 선별하며 스킬·로컬 이전 기록·설치 도구·생성물은 제외한다. 사용자 프로필 타입의 필드 정의는 포함하지만 실제 연봉·프로필·이력서 원본은 포함하지 않는다.

`npm run check` 통합 명령을 추가해 typecheck·lint·build·test·check:publish를 모두 재실행해 통과했다. 스테이징 후 `npm run check:publish -- --staged`로 index 전체 35개 파일의 실제 내용을 검사해 통과했다. 공개 파일만으로 구성된 별도 Git 사본에서도 `npm ci --no-fund`와 `npm run check`를 실행해 통과했다(취약점 0, 테스트 2개 파일·11개 통과). 로컬 스킬·도구·이전 기록·비밀 파일은 검증 사본에 없음을 확인했다. 모든 공개 Markdown 상대 링크와 필수 인수인계·고지 파일 8개가 index에 존재한다. 커밋 직전 원격을 다시 확인하고 main에 일반 push한다. 커밋 작성자에는 GitHub 공개 계정의 noreply 주소를 사용하여 개인 이메일을 노출하지 않는다.

공개 클론의 진입 문서는 README.md이며 AGENTS.md·PRODUCT.md·DESIGN.md·architecture.md·license-boundary.md·이 문서와 라이선스 고지가 모두 포함된다. 공개 클론에 없는 스킬이나 이전 원본 기록 없이 다음 작업의 범위·제품 원칙·구조·실행·검증·미해결 사항을 이해할 수 있도록 작성했다. 원격 반영 후에는 main의 커밋과 실제 문서 목록을 확인한다. 특정 서비스 계정의 저장소 연결 권한은 이 파일 확인과 별개다.
