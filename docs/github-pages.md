# GitHub Pages 배포

소스 저장소와 공개 사이트를 구분한다. GitHub에는 React/TypeScript 원본과 검증 파일을 저장하고, GitHub Actions에서 빌드한 `dist`만 Pages에 배포한다. `dist`를 main에 직접 커밋하거나 저장소 루트를 정적 사이트로 게시하지 않는다.

2026-10-14 실제 공개 URL을 확인했을 때 HTML은 HTTP 200이었지만 `<script src="/src/main.tsx">`를 포함했고 해당 요청은 HTTP 404였다. 빌드 전 HTML이 게시되어 화면이 실행되지 않는 상태였다. favicon 누락은 별도 문제다.

## 준비된 설정

- `vite.config.ts`: 빌드/preview는 `/career-radar/`, 로컬 dev는 `/` 경로.
- `.github/workflows/pages.yml`: main push/수동 실행 → Node LTS·npm ci → check → dist 업로드 → Pages 배포. 빌드 실패 시 배포하지 않는다.
- `public/favicon.svg`와 index의 아이콘 링크: 기존 자체 작성 레이더 아이콘을 사용하며 base 경로를 반영한다.
- 저장소 루트·server·automation·docs·스킬·개인 데이터는 Pages artifact에 넣지 않는다. API 키가 필요한 workflow secret도 없다.

## GitHub에서 필요한 설정

변경 파일을 검토·커밋·일반 push한 후 저장소 Settings → Pages → Build and deployment → Source를 **GitHub Actions**로 선택한다. Deploy from a branch로 원본 루트를 게시하지 않는다. 소스 설정을 바꾼 뒤 Actions에서 `Deploy dashboard to GitHub Pages` → Run workflow(main)를 실행할 수 있다. 이후 main에 push하면 자동 검증·배포된다.

Actions에서 build/deploy 성공을 확인하고 배포 URL의 HTML이 `/career-radar/assets/…js`를 참조하는지, JS/CSS/favicon이 HTTP 200인지 확인한다. 소스의 `/src/main.tsx` 요청은 배포 HTML에 없어야 한다. 오래된 화면이 보이면 강력 새로고침한다.

현재 설정 준비·로컬 검증과 실제 GitHub 배포 성공은 별개다. GitHub 설정 변경·커밋·push·Actions 실행 전에는 공개 사이트 수정 완료라고 보고하지 않는다.

2026-10-14 로컬 검증: `npm run check`의 타입 검사·ESLint·Vite 빌드·Apps Script 패키징·84개 테스트·공개 후보 검사 통과. 실제 브라우저로 `/career-radar/` 빌드 화면이 실행됐고 JS·CSS·favicon 요청 3개가 HTTP 200, 브라우저 오류/실패 요청 0건이었다. artifact는 HTML·JS·CSS·SVG 4개 파일만 포함했고 서버 비밀 설정 식별자/개인 경로/대표 토큰 패턴이 발견되지 않았다. workflow는 로컬 검토 상태이며 GitHub Actions에서 실행한 결과가 아니다.

## 로컬 빌드 결과 확인

`npm run build` 후 `npm run preview`를 실행하고 `http://127.0.0.1:4173/career-radar/`를 연다. 개발 서버는 기존 `npm run dev` 및 `http://127.0.0.1:5173/`를 유지한다.

Pages는 공개 프런트엔드다. 이 설정으로 Google Sheets 읽기·사람인 수집·AI 분석 서버가 실행되는 것은 아니다. 개인 데이터 연결은 소유자 인증을 검증한 별도 경로에서 진행한다. 공개 저장소의 GitHub 호스팅 runner와 Pages 범위만 사용하며 유료 runner·결제 연결·API 서비스를 활성화하지 않는다.

공식 근거: [Vite 정적 배포](https://vite.dev/guide/static-deploy.html#github-pages), [GitHub Pages 게시 소스 설정](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
