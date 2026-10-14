# 사람인 승인 대기 구현 검증 기록

이 문서의 아래 수치는 당시 로컬 검증 기록이다. 이후 사용자 제공 Google 실행 로그에서 승인 전 보류 `HOLD_APPROVAL_CONFIGURATION`·수집 0건·실행 완료를 별도로 확인했다. 실제 수집·공고 저장·일일 트리거·AI·메일 실행의 근거로 확대하지 않는다.

검증일: 2026-10-14. 로컬 Node 24.21.0·npm 11.19.0. 기존 main HEAD `c91b385a13e0ecfeacb431d4413b8e79445be22c` 유지. 재초기화·추가 패키지 설치·커밋·푸시는 하지 않았다. 이전 UI/백엔드 미커밋 변경을 보존했으며 이번에는 화면/CSS를 수정하지 않았다.

## 실행과 구분

| 명령/작업 | 결과 | 근거의 한계 |
|---|---|---|
| `npm run check` | typecheck·ESLint·Vite build·GAS 패키징·Vitest·공개 후보 검사 통과 | 실제 서비스 연결 성공을 의미하지 않음 |
| `npm run test:official-examples` | 7개 통과 | 과거 공식 예시의 일부 사실 필드를 재구성한 입력 |
| `npm run demo:automation` | 합성 입력 2 → 중복 제거 1 → 최초 변경 1 → 반복 변경 0, 실제 공고/메일 0 | 합성 전용, 네트워크 없음 |
| Vitest 전체 | 8개 파일·84개 테스트 통과 | Google는 VM 모의 서비스, API는 모의 transport |
| `git diff --check` | 공백 오류 없음 | 기존 미커밋 변경도 함께 검사 |
| `git check-ignore` | 환경파일·private 데이터·node_modules·로컬 도구·생성 GAS·스킬·이전 기록 제외 확인 | 실제 스테이징/커밋 없음 |

생성된 Core.gs도 VM에서 실행했다. Google의 signed byte 형태로 모의한 SHA-256 결과와 서버 해시를 공고 ID 기준으로 대조했다. API 200 오류 코드, quota, 제한된 재시도, 페이지 재개, 저장 실패, 모호한 저장 직후 재실행, 트리거 중복/파일럿 차단, 로그에 키/검색 조건/공고 상태 원본을 남기지 않는 동작을 시험했다.

실제 데이터 수집 **0건**, 인증된 API 호출 **0회**, Google OAuth/시트 설치/트리거 생성 **0회**, AI **0회**, 메일 발송 **0회**. 이번에는 인증 없는 API probe도 다시 실행하지 않았다. 공식 웹 문서 열람과 실제 채용 API 호출은 구분한다.

`check:publish`는 공개 후보의 내용과 제외 경계를 검사했고 통과했다. 실제 키·개인 프로필·원본 메일은 작업 입력에 사용하지 않았다. `.setup/apps-script` 산출물은 로컬 전용이며 소스와 생성 스크립트만 공개 후보에 포함된다. GitHub 반영 여부는 이 로컬 검증과 별개다.

## 이번 작업의 파일

신규:

- `server/collectors/saramin-runner.ts`, `server/collectors/official-email.ts`
- `scripts/build-apps-script.mjs`
- `automation/apps-script/Collector.gs`, `automation/apps-script/collector-manifest.json`
- `tests/fixtures/saramin-documentation.ts`, `tests/saramin-official-examples.test.ts`, `tests/saramin-runner.test.ts`, `tests/apps-script-collector.test.ts`, `tests/official-email.test.ts`
- `docs/saramin-operations.md`, `docs/official-email-fallback.md`, `docs/automation-validation.md`

수정:

- `server/collectors/saramin-normalize.ts`, `server/pipeline/filter.ts`
- `automation/apps-script/Bootstrap.gs`, `tests/apps-script.test.ts`, `tests/automation.test.ts`
- `scripts/probe-public-apis.mjs` (고용24 endpoint 제외), `package.json`
- `AGENTS.md`, `PRODUCT.md`, `README.md`, `docs/architecture.md`, `docs/automation-feasibility.md`, `docs/automation-setup.md`

이 목록은 이번 수정 범위이며 `git status`에는 이전 단계의 미커밋 화면/자동화 파일도 추가로 나타난다. 스킬·라이선스 고지 원본과 개인정보 제외 규칙은 보존했다.

## 다음 실제 검증

[운영 절차](saramin-operations.md)에 따라 소유자 비공개 Google 환경을 준비하고, 사람인 승인·허용된 저장 범위를 확인한 뒤 본인이 키·최소 비교 조건을 Script Properties에 입력한다. 소량 수동 수집 → 원문 대조 → 반복/재개 → 다음날 예약 실행 기록 순으로 실검증한다. 개인정보 원본/무료 AI 전송·알림 worker·React 인증 연결·장기 보관 정책은 아직 완료되지 않았다.
