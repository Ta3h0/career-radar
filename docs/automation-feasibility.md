# 3단계: 자동화 실사용 가능성과 MVP 범위

확인일: 2026-10-14 (Asia/Seoul). 기준 커밋: `c91b385a13e0ecfeacb431d4413b8e79445be22c`.

## 최신 결정: 사람인 승인 대기 수집 MVP

사용자가 고용24 일반 채용정보 API의 개인회원 이용 불가를 확인하여 MVP에서 제외했다. 사람인 이용신청은 완료했고 승인 대기 중이다. 이후 구현은 [saramin-operations.md](saramin-operations.md), 실제 로컬 검증은 [automation-validation.md](automation-validation.md), 승인 거절 시 대안은 [official-email-fallback.md](official-email-fallback.md)를 따른다. 수집·저장·예약 어댑터를 모의 검증했지만 실제 키 수집·Google 실행·AI·발송 성공은 아직 없다.

이하 문서는 이 업데이트 이전의 최초 조사·환경 점검 기록이다. 당시의 ‘준비 없음’·‘readiness만 구현’·고용24 자격 검토 항목은 역사적 상태이며 현재 범위에는 위 결정을 우선한다.

## 소스와 실행 환경 확인

GitHub의 기준 커밋에서 README·AGENTS·PRODUCT·DESIGN·architecture·package.json 및 src 11개·server 2개, 총 19개 파일을 실제 읽었다. GitHub 전체 35개 파일의 blob SHA와 로컬 Git 기준을 대조했으며 origin/main도 같은 커밋이었다. 이 세션에서는 로컬 경로 접근과 Node LTS 실행을 직접 확인했다. 다른 환경에서 같은 Windows 경로에 접근할 수 있다는 뜻은 아니다. GitHub에 없는 스킬·이전 원본 기록을 원격에서 확인했다고 주장하지 않는다. 다른 에이전트와 동시 편집하지 않았으며 재초기화·추가 의존성 설치·커밋·푸시는 하지 않았다.

사용자가 API 승인·키·Google/Gemini 준비가 아직 없다고 확인했다. 따라서 인증된 수집·Google 예약 실행·Sheets 저장·AI 호출·이메일 발송은 실검증할 수 없다. 아래에서 문서 근거, 실제 네트워크 결과, 합성 테스트를 구분한다.

## A. 고용24 공식 API

| 확인 항목 | 공식 확인과 판단 |
|---|---|
| 개인 이용 | [공식 소개](https://www.work24.go.kr/cm/e/a/0110/selectOpenApiIntro.do)는 기업회원 전용이라고 안내한다. 개인회원만으로 사용할 수 있다고 판단하지 않는다. 실제 신청 자격과 예외는 담당자 확인이 필요하다. |
| 인증·발급 | 기업회원 가입·로그인 → 서비스 신청 → 담당자 심사 → authKey 발급. 키 양도 금지. |
| 목록 | [목록 명세](https://www.work24.go.kr/cm/e/a/0110/selectOpenApiSvcInfo.do?fullApiSvcId=000000000000000000000000000000): `callOpenApiSvcInfo210L01.do`, GET, authKey, callTp=L, returnType=XML, startPage/display. 페이지 최대 1000, 한 페이지 최대 100. 일일 계정 한도는 미확인. |
| 상세·본문 | [상세 명세](https://m.work24.go.kr/cm/e/a/0110/selectOpenApiSvcInfo.do?fullApiSvcId=000000000000000000000000000000%5E000000000000000000000000000001%5E000000000000000000000000000003): `callOpenApiSvcInfo210D01.do`, callTp=D, wantedAuthNo, infoSvc=VALIDATION, XML. `wantedInfo.jobCont`가 직무내용이며 모집직종·급여조건·근무예정지 등도 정의되어 있다. 실제 본문 충실도는 승인된 표본으로 확인해야 한다. 첨부파일·사이트 전체 전문까지 제공된다는 뜻은 아니다. |
| 저장·AI·재전달 | 상세 명세는 원문 이동 버튼·출처 이미지 고지를 요구하며 무단 복제·배포 금지를 표시한다. 개인 DB/Sheets 보관기간, 요약·이메일 재전달, 외부 AI 전송의 허용 범위를 확인하지 못했다. API가 공개되어 있다는 이유로 자동 허용하지 않는다. 대표자·담당자·연락처 같은 불필요한 필드는 수집 대상에서 제외한다. |
| 비용·현재 상태 | 공개 안내만으로 사용자 계정의 무료 이용·쿼터·자격을 확정하지 않는다. 결제 연결 없음. 기업회원 자격·승인 확인 전 수집기 활성화 보류. |

## B. 사람인 공식 API

| 확인 항목 | 공식 확인과 판단 |
|---|---|
| 개인 프로젝트 승인 | [이용신청 폼](https://oapi.saramin.co.kr/join)은 개발자 정보·회사/학교·부서/전공·사용 URL·50자 이상 목적·약관 동의를 요구한다. 개인 승인 가능/불가를 명시한 확약은 확인하지 못했다. 개인 비상업 목적을 사실대로 제출해 심사받아야 하며 소속을 꾸며 쓰지 않는다. |
| 발급 | [키 발급 절차](https://oapi.saramin.co.kr/guide/1): 이용신청 승인 메일 → 로그인 → Application 앱 등록 → access-key. |
| 목록·단건 | [목록 명세](https://oapi.saramin.co.kr/guide/job-search)와 [공고번호 조회](https://oapi.saramin.co.kr/guide/job-search-id)는 같은 GET `/job-search`를 사용한다. access-key는 쿼리, Accept로 JSON/XML 선택, id로 특정 공고 조회. 키가 URL에 있으므로 전체 요청 URL을 로그에 기록하면 안 된다. |
| 명세 필드 | id·url·active, company.detail.name, position.title/location/job-type/job-code/experience-level/required-education-level, salary.code/name, 게시·수정·시작·마감 Unix timestamp, close-type, keyword. 선택 날짜/키워드 코드/조회·지원수도 있다. 이 목록은 공식 명세이며 실제 승인 응답을 수신한 결과가 아니다. |
| 전문 확보 | 공개 목록/단건 스키마에 공고 전문 반환 필드를 확인하지 못했다. 키워드가 직무내용을 검색한다는 것은 본문을 반환한다는 뜻이 아니다. 원문 URL은 사용자 이동에만 사용하며 HTML·이미지·첨부를 자동 추적하지 않는다. 전문이 필요하면 공급자의 추가 공식 제공 방식과 권한을 문의한다. |
| 한도 | [주의사항](https://oapi.saramin.co.kr/caution)과 신청폼은 일 최대 500호출 제한을 명시한다. [FAQ](https://oapi.saramin.co.kr/help)는 진행 중 공고만, 1회 최대 110건이라고 안내한다. start는 명세상 0 기반 페이지이나 실제 페이지 이동·총 결과 커버리지·계정별 집계는 승인 후 확인해야 한다. 500호출을 500공고로 단정하지 않는다. |
| 권리·비용 | 키 공유·소스 복제 관련 제한·재판매·대가 수취·출처 사칭 금지가 있다. 저장·AI 전송·요약 메일 허용 범위는 공개 문서만으로 확정하지 못했다. 0원 조건으로 신청하되 승인·이용조건 확인 전 운영하지 않는다. |

[공식 연봉 코드표](https://oapi.saramin.co.kr/guide/code-table1)는 일부 코드가 범위가 아닌 하한임을 명시한다. 예를 들어 코드 16은 4천만원 이상이다. 임의 상한을 만들지 않고 월급/시급·협의·미확인 코드는 연봉으로 추측 변환하지 않는다.

## C. Google 무료 자동화 환경

| 구성 | 가능성·권한·제한·검증 방법 |
|---|---|
| Apps Script 예약 | [설치형 시간 트리거](https://developers.google.com/apps-script/guides/triggers/installable)로 브라우저·PC가 꺼져 있어도 Google에서 실행 가능하다. 생성자 계정 권한으로 실행하고 수동 OAuth 승인이 필요하다. 오전 9시 트리거는 9~10시 사이로 지연될 수 있어 정각 SLA로 표시하지 않는다. 실제 계정의 실행 기록·타임존·마지막 성공·실패를 확인해야 한다. |
| 무료 한도 | [개인 계정 quota](https://developers.google.com/apps-script/guides/services/quotas): 실행당 6분, 트리거 총 90분/일, URL Fetch 20,000회/일, 메일 수신자 100명/일. 공급자 쿼터가 별도로 더 작을 수 있으며 한도·실행 보장은 없다. 파일 저장은 개인 Drive 공간 한도에도 속한다. |
| Google Sheets | 소유자만 접근하는 비공개 시트에 공고·상태·체크포인트·대기열을 분리한다. 원문 보관 승인을 먼저 확인한다. 일괄 쓰기, 실행 잠금, source+id upsert, 보존기간·정리·수식 주입 방지가 필요하다. 무제한 DB나 트랜잭션 DB로 취급하지 않는다. OAuth 후 소량 읽기/쓰기·재실행·실패 복구로 확인한다. |
| Gemini 무료 | [가격표](https://ai.google.dev/gemini-api/docs/pricing)에 무료 계층이 있는 모델이 있으나 [실제 계정 한도](https://ai.google.dev/gemini-api/docs/rate-limits)는 AI Studio에서 확인해야 한다. 키·사용자 동의·공급자 콘텐츠 처리 허용·모델별 무료 확인 후에만 활성화한다. billing 활성화·체험 결제·유료 대체 모델을 사용하지 않는다. |
| Gemini 데이터 제한 | [추가 약관](https://ai.google.dev/gemini-api/terms)은 무료 서비스에 개인·민감·기밀정보를 보내지 말라고 명시하며 입력/출력을 서비스 개선에 사용할 수 있다고 안내한다. 개발자의 professional/business 용도라는 제한도 확인해야 한다. 이름 제거만으로 실제 경력·연봉·이력서가 전송 가능해지지 않는다. **실제 프로필 직접 전송은 보류**한다. 허용된 공개 공고 요약과 합성 조건 실험만 별도 검토하며, 개인 조건 비교는 비공개 영역의 규칙으로 수행하는 범위를 우선한다. |
| 이메일 | [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app)은 OAuth 승인 후 발송 가능하다. 동의한 소유자 1명에게 일일 요약 1회로 시작하고 남은 quota 확인·outbox 키·재시도 상한이 필요하다. 공급자 접수와 실제 수신은 별개다. 발송 중 네트워크 단절은 미확인으로 보존하고 무조건 재전송하지 않는다. 현재 실제 수신자·발송 없음. |
| React 연결 | 비공개 Sheets를 공개 JSON/CSV·누구나 웹앱·JSONP로 노출하지 않는다. 0원 우선 후보는 소유자 제한 [Apps Script HTML Service 웹앱](https://developers.google.com/apps-script/guides/web)에 React 빌드를 탑재하고 [google.script.run](https://developers.google.com/apps-script/guides/html/communication)으로 서버 함수를 호출하는 방식이다. 이 API는 HTML Service 페이지에서만 쓰며 localhost에서 바로 동작하지 않는다. 별도 React 호스팅을 유지하려면 OAuth·허용 origin·권한·CSRF/CORS/리디렉션 검증이 추가로 필요하다. 현재 어느 경로도 배포·실연결하지 않았다. |

키는 소유자만 편집하는 Script Properties 또는 승인된 서버 환경에서 관리한다. Script Properties는 프로젝트 편집자가 읽을 수 있는 설정 저장소이며 전용 비밀 금고라고 보장하지 않는다. 프런트 VITE_* 변수·시트 셀·공개 Git·전체 요청 URL 로그에 넣지 않는다. [Properties 문서](https://developers.google.com/apps-script/reference/properties)를 따른다.

## 단계별 구현·실검증 기준

| 단계 | 지금 구현/확정 범위 | 필요한 키·승인과 비용 | 기술 위험과 통과 기준 |
|---|---|---|---|
| 매일 실행 | readiness용 GAS 코드 준비 | Google 계정·OAuth, 개인 무료 quota | 잠금·타임존·중복 트리거·지연·실행 로그. 실제 Google 트리거 실행으로 통과 판단 |
| 신규 수집 | 공식 API 인증 요구 probe, 실제 수집기는 보류 | 사람인 승인/access-key, 고용24 자격/승인/authKey | HTTP 200만으로 성공 판단 금지. 소량 표본·페이지 이동·일 한도·429/5xx·재시도 상한 확인 |
| 정규화 | 사람인 JSON 순수 함수 구현 | 키 없음, 추가 비용·의존성 없음 | 경계 검증·공식 URL·누락/null·안전한 필드만 보존. 합성 테스트 후 실제 승인 표본과 대조 |
| 중복 제거 | 동일 출처 ID 제거, 출처 간 후보 그룹 보존 | 키 없음, 0원 로컬 | 최신 수정 선택·재실행 불변·출처 손실 방지. 유사도만으로 공고 삭제 금지 |
| 직무·지역·연봉 필터 | 필수/희망·미확인 분리 | 사용자 조건은 비공개, 키 없음 | 정확한 직무명 비교·계층 지역·연봉 단위/하한/상한·누락 테스트. 미확인을 부적합으로 단정하지 않음 |
| AI 적합성 | 후보 분리 후 정책/본문 부족으로 보류 | 무료 키·한도·내용 처리 허용·개인정보 정책, 결제 없음 | 실제 프로필 전송 금지. 허용 입력·JSON 스키마·출처 근거·프롬프트 주입·할루시네이션·무료 한도 확인 후 별도 구현 |
| 저장 | readiness 상태 저장 코드 준비; 공고 영속 저장은 미구현 | 비공개 Sheets·OAuth·보관 허용, 무료 한도 | 부분 실패·재실행·수식 주입·보존기간·소유권 검증. 체크포인트와 대기열을 함께 보존 |
| 이메일 | outbox/동의/미확인 전달 설계, 발송 미구현 | Google OAuth·수신 동의·남은 MailApp quota | 같은 공고/프로필/일자 발송 키, 실패 기록·제한 재시도·전달 불명확 상태 테스트 |
| 대시보드 | 기존 최소 셸 유지, 안전 연결 경로 결정 전 보류 | 소유자 인증·배포 검수 | 로그인한 소유자만 읽기, 로그아웃·다른 계정·익명 접근 차단·번들 비밀 없음 확인 |

## 확정한 자동화 MVP 범위

1. 지금: 사람이 없어도 반복 가능한 데이터 처리를 먼저 개발한다. 합성 사람인 JSON → 검증/정규화 → 출처 ID 중복 제거 → 필수 조건 필터 → 변경 후보 분리까지 구현한다. AI 결과를 만들어 완료로 표시하지 않는다.
2. 승인 후 1차 운영 후보: **사람인 메타데이터 → 비공개 Sheets → 규칙 비교 → 소유자 일일 요약**. 개인 신청 승인·저장/메일 범위 확인이 선행 조건이다. 초깃값은 하루 최대 3요청×20건 정도의 보수적 pilot 예산이며 실제 계정 한도 이하로 확정한다. 전체 신규 공고 완전 수집이라고 주장하지 않는다.
3. 고용24는 기업회원 자격과 승인을 확보했을 때 추가한다. 개인회원에서 우회하거나 스크래핑으로 대체하지 않는다.
4. 무료 AI는 허용된 공고 정보의 근거 있는 요약부터 검토한다. 실제 이력서 기반 개인 분석을 무료 Gemini에 바로 보내는 MVP는 확정하지 않는다. 무료·개인정보·공급자 권리를 모두 충족하지 못하면 AI 단계는 계속 보류하고 미구현 사유를 표시한다.
5. React는 같은 비공개 Apps Script 웹앱 내부 연결을 첫 검증 후보로 둔다. CSP/번들·인증된 서버 호출을 시험하기 전 현재 로컬 셸이 Sheets에 안전 연결됐다고 표시하지 않는다.

따라서 기술적으로 가능한 무료 구성과 **현재 사용자에게 승인된 완전 자동화**는 다르다. 이번 단계에서 승인 전 가능한 구현 범위는 확정했지만 일일 실수집·개인 AI 분석·이메일 자동화의 실사용 승인은 아직 없다.

## 실제 네트워크와 합성 검증 구분

`npm run probe:apis`로 공식 목록 endpoint에 키 없이 최소 요청을 1회씩 보냈다. 사람인: HTTP 200 / JSON / `authentication-required`. 고용24는 최초 probe에서 HTTP 200 / XML / 미분류였으므로 추가 최소 요청 1회로 확인했다. XML 루트 GO24, error 요소와 인증 요구 표현이 있으며 wanted 공고 요소는 0개였다. authKey 표기의 구분자 차이를 인식하도록 probe 정규식을 수정했다. 인증 실패의 숫자 코드는 추출·확정하지 않았다. 두 API 모두 인증된 수집 성공이 아니다. 원문 응답은 저장하지 않았으며 **실제 수집 성공 0건**, AI 요청 0회·메일 0건이다. 총 요청은 고용24 2회, 사람인 1회다. 이 probe는 승인된 수집을 대신하지 않는다.

`npm run demo:automation`은 합성 공고 2건(같은 ID) → 1건 → 첫 실행 변경 1건 → 같은 입력 재실행 변경 0건을 보여준다. 실제 공고·프로필이 아니다. 조건 버전이 바뀌면 다시 비교한다. 이전 해시는 **프로필별** 비공개 저장으로 분리해야 한다. nextHashes는 조건 비교 체크포인트일 뿐 AI 완료/메일 발송 기록이 아니다. 라이브 저장 시 결정·보류 대기열을 함께 보존하고 보류를 나중에 재개해야 한다.

API mapper는 공개 JSON 명세를 바탕으로 합성 테스트한 부분집합이다. 실제 계정의 빈 응답·필드 생략·정렬·페이지·본문·단위 변형은 승인 표본을 받은 뒤 확정한다. 경험연수는 이번 mapper에서 아직 매핑하지 않아 null이며 AI로 추정하지 않는다.

Apps Script 코드는 `AutomationReadiness` 시트에 하루 한 번 **승인 대기**만 기록하는 실행환경 점검용이다. 승인 플래그를 넣어도 live collector 미구현 보류다. 실제 공고·AI·이메일 기능이 없고 Google에 설치·배포·실행하지 않았다. V8 VM에서 서비스 모의 객체를 사용해 중복 실행·잠금·쓰기 실패·트리거 중복 방지만 검사했다.

다음 사용자 작업과 복사할 신청 목적, 비공개 Google 환경 점검 절차는 [automation-setup.md](automation-setup.md)를 따른다.

## 변경 파일과 실행 결과

변경: `AGENTS.md`, `PRODUCT.md`, `README.md`, `docs/architecture.md`, `package.json`, `src/domain/jobs.ts`.

추가: `server/collectors/saramin-normalize.ts`, `server/pipeline/deduplicate.ts`, `server/pipeline/filter.ts`, `server/pipeline/prepare.ts`, `server/demo.ts`, `scripts/probe-public-apis.mjs`, `tests/automation.test.ts`, `tests/apps-script.test.ts`, `automation/apps-script/Bootstrap.gs`, `automation/apps-script/appsscript.json`, `docs/automation-feasibility.md`, `docs/automation-setup.md`.

`npm run check`: typecheck·ESLint·Vite 프로덕션 빌드·Vitest·공개 후보 검사 통과. Vitest는 4개 파일·52개 테스트 통과. 공개 검사 대상은 47개 파일이다. 테스트의 합성 URL 자격정보 예제도 민감정보 패턴에 맞지 않게 정리했으며 검사 규칙을 완화하지 않았다. `npm run demo:automation`은 합성 2건 → 고유 1건 → 재실행 변경 0건, AI 보류·실수집 0·메일 0을 출력했다. 문서 상대 링크와 `git diff --check`도 통과했다.

기존 로컬 스킬 172개 파일 SHA-256은 보존했고 미확인 라이선스 파일·이전 기록·로컬 도구·환경 파일은 계속 Git 제외다. 기존 Git 커밋과 원격을 변경하지 않았으며 작업 파일은 로컬에 남겼다. 화면은 변경하지 않아 반응형 시각 검수를 새로 수행했다고 주장하지 않는다. 클라우드 설치·실제 API 인증·Google 저장/예약/메일·Gemini 실호출은 여전히 미검증이다.
