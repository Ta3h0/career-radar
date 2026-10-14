# 공개 저장소와 로컬 스킬의 경계

확인일: 2026-10-14. GitHub CLI로 `Ta3h0/career-radar`의 `isPrivate: false`, 기존 `main` 커밋을 확인했다.

## 보존과 제외

스킬 7개와 모든 기존 LICENSE·저작권·출처 고지는 로컬 원본 그대로 보존한다. 정확한 upstream revision 및 재배포 근거 확인 전에는 `.agents/skills/` 전체를 Git에서 제외한다. 임시 런타임·설치 증거도 `.tools/`, `.setup/`으로 제외한다.

로컬 이전 기록 `docs/skill-migration.md`, `docs/skill-migration-manifest.json`, `docs/skill-validation.json`에는 원본 컴퓨터의 경로가 포함되어 있어 공개 대상에서 제외한다. 이 문서가 공개 클론의 제약 안내를 대신한다. [보존한 upstream MIT 원문](licenses/nextlevelbuilder-MIT.txt)은 특정 upstream에 관한 고지이며 앱 전체를 재라이선스하지 않는다.

| 스킬 | 유지한 근거 | 재배포 전 필요한 확인 |
|---|---|---|
| ui-styling | SKILL.md MIT 표시, LICENSE.txt Apache 2.0 원문 | 저작권자·정확한 버전별 적용 범위, 고지와 변경 표시 의무의 충돌 해소 |
| brand / slides | 원래 author 및 참조 | 개별 파일 출처·라이선스 근거 |
| design / banner-design / design-system | MIT 표시 | 정확한 원본 revision·저작권 고지 |
| ui-ux-pro-max | 데이터 provenance·폰트 라이선스 | 로컬 수정 이력, 코드와 제3자 데이터 권리 |

공식 출처 확인이 끝나면 검증한 파일만 고지와 함께 재도입할 수 있다. 다른 방법은 권한 확인 후 접근이 제한된 별도 저장소에서 관리하는 것이다. 비공개 저장소 사용만으로 재배포 권한이 자동 확보되지는 않는다. 현재는 별도 저장소도 만들지 않는다.

## 커밋·푸시 전 검사

`npm run check:publish`는 추적 파일 및 ignore되지 않은 새 파일을 검사한다. `npm run check:publish -- --staged`는 Git index의 전체 추적 파일 목록과 index에 저장된 실제 내용을 검사한다. 민감 파일 경로, 대표적인 키·토큰·개인 이메일 형태, 스킬이 추적 대상으로 들어오는 경우를 실패 처리한다. 읽을 수 없는 검사 대상도 실패 처리한다. 출력에는 발견한 값 대신 경로·종류만 남긴다. 패턴 검사가 모든 개인정보와 비밀을 보증하지는 않으므로 실제 diff도 검토한다.

`.gitignore`는 이미 추적 중인 파일을 숨기지 않는다. 검사 스크립트는 추적 파일도 포함한다. `git add -f`로 로컬 스킬·증거·환경 파일을 우회 추가하지 않는다. 사용자가 승인한 이번 공개 반영은 앱·설정·테스트·공개 문서만 선별하며, 스킬 권리 확인의 완료나 개인 자료 공개 승인을 의미하지 않는다.
