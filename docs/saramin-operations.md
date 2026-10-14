# 사람인 승인 대기 중 준비한 수집 MVP

2026-10-14. 사용자 보고: 신청 완료·승인 대기. 고용24 일반 채용정보 API는 개인회원 이용 불가로 MVP 제외. **이 문서는 실행 준비와 로컬 검증 결과이며 실제 수집 성공 보고가 아니다.**

후속 사용자 확인: bound Apps Script에 생성 파일을 복사한 뒤 수동 실행한 Google 로그에서 `HOLD_APPROVAL_CONFIGURATION`, `recordsCollected: 0`, 실행 완료가 확인됐다. 이는 Google에서 승인 전 보류 경로가 실행됐다는 근거이며, 실제 키 인증·공고 저장·예약 실행 성공은 아니다. 키·활성화 속성·매일 트리거는 설정하지 않는 단계다. 아래 설치 절차는 재설치/다른 환경을 위한 참고로 유지한다.

## 구현 범위와 경계

`server/collectors/saramin-runner.ts`가 승인/이용범위/0원/키/검색어/조건을 확인한 뒤 공식 JSON 요청 → 검증·정규화 → 출처 ID 중복 제거 → 필터 → 페이지 journal 저장을 수행한다. 네트워크·저장·예산은 주입한 어댑터가 맡는다. 기존 화면을 변경하지 않았다.

| 단계 | 준비한 동작 | 아직 필요한 실검증 |
|---|---|---|
| 조회 | `/job-search`, JSON, 0 기반 페이지, 수정일 오름차순, 고정 시간창과 24시간 겹침 | 승인된 키, 실제 페이지·시간 경계·동일 시각 정렬 동작 |
| 정규화 | 명시된 메타데이터만 보존, 경력 범위·연봉 단위·출처 표시, 문서 API 추적 파라미터만 유지 | 최신 실제 응답의 필드/단위 대조 |
| 필터 | 필수 직무·지역·고용형태·경력·연봉, 미확인과 제외 구분 | 본인이 비공개로 설정할 조건과 검색어 |
| 저장 | 소유자 전용 bound Sheet의 `SaraminJournal`, 페이지별 JSON append, 재생으로 상태 복원 | 실제 Google OAuth·쓰기·복구·보관기간 확인 |
| 예약 | 실행 잠금, 수동 파일럿 확인 후 매일 09시대 KST 트리거, 기존 트리거 중복 방지 | Google 설치와 실제 다음날 실행 기록 |
| 분석/알림 | 공고별 해시+조건 버전 대기 항목, 변경 없으면 재생성하지 않음, 발송 미확인 상태 계약 | AI·메일 worker/수신 동의/권리·무료 조건 검증. 현재 실제 분석·메일 코드 호출 없음 |

`hold-analysis`는 필터 통과 후 분석 보류, `needs-review`는 정보 부족, `excluded`는 조건 제외다. 이는 완성된 이메일 outbox가 아니라 후속 분석·알림을 위한 영속 대기 구조다. 향후 발송 중 끊긴 항목은 `delivery-unknown`으로 두고 자동 재발송하지 않는 복구 함수를 준비했다. 실제 발송·동의·수신자 관리 worker는 아직 없다.

## 공식 명세를 적용하면서 발견한 사항

[요청/JSON 예시](https://oapi.saramin.co.kr/guide/job-search)와 [연봉 코드표](https://oapi.saramin.co.kr/guide/code-table1)를 대조했다. 역사적 예시의 코드 18과 현재 코드표 금액이 달라, 충돌 시 연봉을 미확인으로 둔다. 명시된 금액 범위는 보존하고 월급을 연봉으로 환산하지 않는다. 경력의 최소·최대도 조건 비교에 사용한다. 전문·필수 기술은 문서에서 확보가 확인되지 않아 추정하거나 HTML을 따라가서 보충하지 않는다.

[주의사항](https://oapi.saramin.co.kr/caution)은 일 최대 500건 호출 표현, 키 공유 금지, 사용 권리 제한, 유료 제공/재판매 제한 등을 명시한다. 정확한 계정 집계 단위·개인 저장기간·요약메일·제3자 AI 전달 허용 여부는 승인 내용/담당 안내로 확인해야 한다. 신청 승인이 저장·외부 AI 이용까지 모두 허용한다는 뜻은 아니다. 소스는 자체 작성했으며 공급자의 서버 소스나 SDK를 복제하지 않았다.

## 지금 준비할 Google 환경

1. 본인 Google 계정의 빈 Sheets를 만들고 일반 액세스를 **제한됨**으로 유지한다. 웹 게시·익명 웹앱·공동 편집자 추가를 하지 않는다.
2. 로컬에서 `npm run build:apps-script`를 실행한다. 생성된 `.setup/apps-script/Core.gs`, `Collector.gs`, `appsscript.json`을 bound Apps Script 프로젝트에 각각 복사한다. 로컬 파일이 자동 업로드되는 것은 아니다.
3. 아직 승인 대기 중이므로 키·활성 플래그를 넣지 않는다. `runDailySaramin`의 실행 결과는 `HOLD_APPROVAL_CONFIGURATION`, 수집 0건이어야 한다. 호출 권한 요청이 나타나면 scope를 확인한다. 코드상 외부 요청을 하지 않아도 Google은 매니페스트 scope에 대한 OAuth를 요구할 수 있다.
4. 수집용 scope는 현재 시트, 트리거 관리, 외부 요청 세 개다. Gmail/메일·AI·Drive 전체 읽기 권한은 없다. 기존 Bootstrap readiness와 수집용 매니페스트는 별도이며 둘을 섞지 않는다.

Script Properties는 서버 설정이지만 프로젝트 편집자는 읽을 수 있다. 본인만 편집한다. 키를 시트 셀·브라우저 환경변수·주소창·스크린샷·이슈·채팅에 넣지 않는다. 설정한 프로젝트를 공개 복제/공유하지 않는다.

## 승인 후 첫 실제 수집 절차

본인이 승인 메일의 무료 이용·저장 범위를 확인한 다음 Apps Script의 프로젝트 설정 → 스크립트 속성에 다음 **이름**을 설정한다. 실제 값은 이 문서나 GitHub에 작성하지 않는다.

| 속성 이름 | 설정 의미 |
|---|---|
| `SARAMIN_ACCESS_KEY` | 본인이 발급받은 실제 키 |
| `SARAMIN_APPROVED` | 실제 이용 승인을 받았을 때만 `true` |
| `SARAMIN_USAGE_REVIEWED` | 비공개 메타데이터 저장·조건 비교의 허용 범위를 확인했을 때만 `true` |
| `ZERO_COST_CONFIRMED` | 사용하려는 계정/서비스에 결제 연결 없이 가능한 범위를 확인했을 때만 `true` |
| `SARAMIN_KEYWORDS` | 좁은 채용 검색어. 이력서나 개인 연락처를 넣지 않음 |
| `SARAMIN_PROFILE_JSON` | `src/domain/profile.ts` 형태의 비교 조건 JSON. 연락처/이력서 불필요. 비공개 설정에서 작성 |
| `SARAMIN_ENABLED` | 위 설정을 모두 확인하고 수동 호출할 때 `true` |
| `SARAMIN_PILOT_VERIFIED` | 아래 수동 검증을 마친 뒤에만 `true` |

조건 JSON의 `id`, `version`, `updatedAt`, `experienceYears`, `required`, `preferred`, `excludedKeywords`를 입력한다. 두 preference 객체는 `roles`, `regions`, `employmentTypes`, `skills` 배열과 `annualSalaryMinKrw`(수 또는 null)를 갖는다. 모르는 조건은 배열 `[]`/수치 `null`로 명시한다. 완성된 개인 JSON을 채팅으로 전달할 필요가 없다.

처음에는 매일 트리거를 만들지 않고 `runDailySaramin`을 수동 실행한다. 기본은 페이지당 5건·실행당 요청 최대 3회다. HTTP 200이어도 본문의 오류 코드로 실패를 판단한다. 키/쿼터/형식 오류는 보류하고, 네트워크/5xx는 동일 페이지에서 한 번만 재시도한다. 실패도 요청 예산에 포함한다. 오류 메시지나 전체 URL을 로그에 남기지 않는다.

실제 결과에서 공고 ID·공식 링크·연봉·경력·시간대·총수·다음 페이지를 원문과 소량 대조한다. `SARAMIN_LAST_RUN` 요약, 비공개 journal, 같은 조건 재실행의 변경 수를 확인한다. 실제 응답을 공개 테스트 자료로 복사하지 않는다. 소량 수집 성공·재실행·부분 재개가 확인되면 파일럿 플래그를 설정하고 `createDailySaraminTrigger`를 수동 실행한다. 트리거 화면 및 다음날 실행 기록까지 확인해야 일일 자동 실행 성공이다.

## 중단·복구와 한계

- 중단은 `SARAMIN_ENABLED`를 `false`로 설정한다. 필요하면 본인 Google 화면에서 해당 `runDailySaramin` 트리거만 제거한다.
- 기본 보호 예산은 같은 프로젝트에서 24시간 구간당 20요청이며 요청 전에 Script Properties에 사용량을 쓴다. 외부 프로젝트/다른 프로그램 호출까지 집계하지 못한다. 공급자 실제 quota가 우선이다. 429/일일 제한은 즉시 보류하며 유료 승격하지 않는다.
- 저장이 확정된 페이지까지만 체크포인트를 전진시킨다. 저장 후 응답이 끊겨도 journal 재생·출처 해시 비교로 중복 후보를 방지한다. 로그 복구 실패 시 자동 초기화/삭제하지 않는다. `SaraminJournal`은 편집하지 않는다.
- 요청 예산 소진은 `PARTIAL_REQUEST_BUDGET`이고 다음 실행은 고정된 시간창의 다음 페이지부터 시작한다. `COMPLETE_WINDOW`는 그 API 가시 결과의 마지막 페이지를 관찰했다는 뜻이다. 진행 중 공고만 반환·페이지 이동 중 수정/종료·동일 timestamp 정렬·48시간보다 긴 색인 지연 때문에 무누락 수집을 보장하지 않는다. 좁은 검색어로 시작하고 매일 새 창으로 따라잡는지 확인한다.
- 오래된 창 재개가 계속되면 신규 공고 확인이 지연된다. 자동 예산 확대 대신 검색 범위/실제 quota/중복 겹침을 검토한다. 응답 누락을 공고 종료로 단정하지 않는다.
- 검색어/조건 버전이 바뀌면 기존 커서 의미가 달라져 `HOLD_SCOPE_CHANGE_REVIEW`로 멈춘다. 기존 private journal을 보존하고 새 범위의 별도 비공개 bound Sheet로 파일럿을 시작한다. 과거 공고 전체 재평가는 아직 자동화하지 않았다.
- 현재 파일럿은 journal 200행, 페이지 JSON 45,000자 한도로 중단한다. DB 무제한 운영용이 아니다. 보존/삭제 의무·정리 정책을 정한 뒤 확장한다. 오래된 메타데이터가 journal에 남으므로 장기 운영 전에 이 절차가 필요하다.
- Google의 [개인 계정 한도](https://developers.google.com/apps-script/guides/services/quotas) 및 [트리거의 시각 지연](https://developers.google.com/apps-script/guides/triggers/installable)을 따른다. 실제 Apps Script V8 호환성·외부 네트워크 응답은 로컬 VM만으로 확정할 수 없다.
- React에는 아직 이 시트를 연결하지 않는다. 소유자 인증·권한 검증 없이 공개 JSON/시트로 내보내지 않는다. 무료 AI·메일 발송은 후속 범위이며 0원/개인정보 조건을 충족하지 않으면 보류한다.

## 검증 기록

공식 예시 테스트는 문서의 과거 숫자·단위·경력·페이지 사실 필드만 재구성하고 기업명/제목을 교체했다. 전체 원본 응답이나 실제 수집 결과가 아니다. 네트워크 테스트는 모의 transport이며 GAS 테스트는 Node VM과 모의 Google 서비스다. Google OAuth·실시트·트리거·실제 키 호출을 실행하지 않았다. 최종 로컬 명령·결과는 [검증 기록](automation-validation.md)에 정리한다.
