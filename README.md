# career-radar

국내 채용공고 자동 수집·조건 비교·무료 AI 근거 분석을 목표로 하는 프로젝트입니다. 현재는 **2단계 개발환경과 최소 대시보드 셸**까지 구성했습니다. 실제 API 수집·분석·저장·이메일·예약 실행은 없습니다.

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

`check`는 typecheck → lint → build → test → 공개 후보 검사를 순서대로 실행합니다. 커밋 직전에는 `npm run check:publish -- --staged`로 실제 스테이징된 전체 파일 내용도 검사합니다.

## 구조와 개발 기준

- `src/domain/`: 공고·조건 프로필·분석 결과 타입, 최소 식별자 경계 검증
- `src/features/dashboard/`, `src/components/`, `src/styles/`: 화면·공통 표시·CSS 토큰
- `server/collectors/`: 고용24·사람인 수집기 계약
- `server/pipeline/`: 중복 제거·조건 필터·분석 검증 계약 (구현 전)
- `docs/`: [아키텍처](docs/architecture.md), [라이선스 경계](docs/license-boundary.md), [환경 검증](docs/development-setup.md)

제품 기준은 [PRODUCT.md](PRODUCT.md), UI 기준은 [DESIGN.md](DESIGN.md), 작업 지침은 [AGENTS.md](AGENTS.md)입니다. 추가 UI 라이브러리는 설치하지 않았습니다. API 키·개인정보는 프런트엔드 환경변수에도 넣지 않습니다.

## Git과 라이선스

원격은 [Ta3h0/career-radar](https://github.com/Ta3h0/career-radar) 공개 저장소이며 기존 README와 커밋 이력을 보존합니다. 이전한 스킬 7개는 라이선스·출처 확인이 끝나지 않아 `.agents/skills/` 전체를 로컬 전용으로 제외했습니다. 클론에 스킬이 없는 것은 의도된 상태입니다. 재배포하려면 먼저 [라이선스 경계](docs/license-boundary.md)를 확인합니다. 앱 코드 자체의 공개 라이선스는 아직 지정하지 않았으며, 보존된 upstream MIT 고지가 앱 전체 라이선스를 의미하지 않습니다.
