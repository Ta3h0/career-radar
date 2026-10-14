# career-radar

국내 채용공고 자동 수집·조건 비교·무료 AI 근거 분석을 목표로 하는 프로젝트입니다. 현재 **사람인 신청 완료·승인 대기**이며, 고용24 일반 채용정보 API는 개인회원 이용 불가로 MVP에서 제외했습니다. 수집·비공개 Sheets 저장·예약 어댑터를 오프라인 검증했고, 사용자 제공 Google 실행 로그에서 승인 전 보류·수집 0건을 확인했습니다. 실제 인증 수집·공고 저장·예약·AI·메일 실행은 아직 없습니다.

## 로컬 실행 (Windows PowerShell)

```powershell
cd E:\career-radar
./scripts/npm.ps1 ci
./scripts/npm.ps1 run dev
```

브라우저에서 http://127.0.0.1:5173 을 엽니다. 종료는 터미널에서 Ctrl+C입니다.

프로젝트 전용 `.tools/node-v24.21.0-win-x64`가 있으면 래퍼가 우선 사용하며 시스템 PATH를 변경하지 않습니다. 다른 PC에서는 [공식 Node.js LTS](https://nodejs.org/en/download) 24.21.0 이상 24.x를 준비합니다. `.tools`는 Git에 포함하지 않습니다. 호환 LTS를 PATH에 설치한 경우 일반 `npm.cmd ci` / `npm.cmd run dev`도 가능합니다. PowerShell 정책 때문에 래퍼 실행이 막히면 검증된 로컬 Node의 폴더를 해당 터미널 PATH 앞에 추가하고 `npm.cmd`를 사용합니다.

## 공개 클론에서 이어서 작업하기

Node 24.21.0 이상 24.x, npm 11.x, Git이 있는 환경에서는 로컬 스킬·전용 도구·인증정보 없이 다음 명령으로 설치·검증합니다. Windows 외 환경에서도 같은 npm 명령을 사용합니다.

```sh
npm ci
npm run check
npm run dev
```

먼저 AGENTS.md → PRODUCT.md → DESIGN.md → docs/architecture.md → docs/license-boundary.md → docs/development-setup.md 순서로 읽습니다. 공개 저장소에는 앱·테스트·계약·공개 문서가 포함되며 `.agents/skills/`와 이전 원본 기록은 포함되지 않습니다. 공개 클론에 없는 로컬 파일을 요구하지 않고 이 문서를 기준으로 이어갑니다. 실제 개인 프로필·연봉 원본·API 키는 개발환경 실행에 필요하지 않습니다.

## 검증

```powershell
./scripts/npm.ps1 run typecheck
./scripts/npm.ps1 run lint
./scripts/npm.ps1 run build
./scripts/npm.ps1 test
./scripts/npm.ps1 run check:publish
./scripts/npm.ps1 run check
```

`preview`는 빌드 결과를 로컬에서 확인하는 용도이며 배포가 아닙니다. 의존성 버전은 `package-lock.json`에 고정합니다.

`check`는 typecheck → lint → build → Apps Script 패키징 → test → 공개 후보 검사를 순서대로 실행합니다. 커밋 직전에는 `npm run check:publish -- --staged`로 실제 스테이징된 전체 파일 내용도 검사합니다.

## 구조와 개발 기준

- `src/domain/`: 공고·조건 프로필·분석 결과 타입, 최소 식별자 경계 검증
- `src/features/dashboard/`, `src/components/`, `src/styles/`: 화면·공통 표시·CSS 토큰
- `server/collectors/`: 사람인 승인 차단 수집기·정규화·공식 이메일 링크 파서와 기존 확장 계약
- `server/collectors/saramin-normalize.ts`: 공식 JSON 명세 부분집합의 런타임 검증·정규화 (합성 테스트, I/O 없음)
- `server/pipeline/`: 출처 ID 중복 제거·조건 필터·변경 후보 준비와 향후 분석 검증 계약
- `automation/apps-script/`: readiness 코드 및 별도의 실제 수집용 Google 어댑터 (Google 실설치 전)
- `docs/`: [아키텍처](docs/architecture.md), [라이선스 경계](docs/license-boundary.md), [환경 검증](docs/development-setup.md)

제품 기준은 [PRODUCT.md](PRODUCT.md), UI 기준은 [DESIGN.md](DESIGN.md), 작업 지침은 [AGENTS.md](AGENTS.md)입니다. 추가 UI 라이브러리는 설치하지 않았습니다. API 키·개인정보는 프런트엔드 환경변수에도 넣지 않습니다.

## 3단계 자동화 검증

[실사용 가능성·MVP 범위](docs/automation-feasibility.md), [Google 설정 절차](docs/automation-setup.md), [사람인 실행·복구 절차](docs/saramin-operations.md), [공식 알림메일 대안](docs/official-email-fallback.md)에 근거·미확인 사항·사용자 작업을 구분했습니다. 사람인 승인과 저장/전달 권리 확인이 우선이며 무료 Gemini의 개인정보/용도 제한은 별도로 해결해야 합니다.

```sh
npm run check
npm run demo:automation
npm run test:official-examples
npm run build:apps-script
```

demo는 합성 입력만 처리합니다. 공식 예시 테스트는 과거 문서의 일부 사실 필드를 재구성한 입력이며 실제 수집 응답이 아닙니다. `build:apps-script`는 `.setup/apps-script`에 Core.gs·Collector.gs·appsscript.json을 생성할 뿐 업로드·호출·예약하지 않습니다. 수집용과 기존 readiness용 매니페스트를 혼용하지 않습니다. `probe:apis`는 사람인의 **키 없는 인증 요구 점검**이며 승인된 수집기가 아닙니다. 실제 키·조건은 비공개 Google Script Properties에만 설정하고 프런트엔드·GitHub에 넣지 않습니다.

## Git과 라이선스

공개 사이트는 원본 TSX를 그대로 게시하지 않고 GitHub Actions에서 빌드한 `dist`를 배포합니다. [Pages 설정·검증 절차](docs/github-pages.md)를 따릅니다. 현재 배포 설정의 준비와 실제 GitHub 배포 성공은 구분합니다.

원격은 [Ta3h0/career-radar](https://github.com/Ta3h0/career-radar) 공개 저장소이며 기존 README와 커밋 이력을 보존합니다. 이전한 스킬 7개는 라이선스·출처 확인이 끝나지 않아 `.agents/skills/` 전체를 로컬 전용으로 제외했습니다. 클론에 스킬이 없는 것은 의도된 상태입니다. 재배포하려면 먼저 [라이선스 경계](docs/license-boundary.md)를 확인합니다. 앱 코드 자체의 공개 라이선스는 아직 지정하지 않았으며, 보존된 upstream MIT 고지가 앱 전체 라이선스를 의미하지 않습니다.
