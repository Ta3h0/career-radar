import { DataState } from '../../components/DataState.tsx'

export function Dashboard() {
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Career Radar 홈">Career Radar</a>
        <span className="phase-label">개발환경 준비</span>
      </header>
      <main id="main-content" tabIndex={-1}>
        <p className="eyebrow">채용공고 자동화</p>
        <h1>매일의 채용 탐색을 한곳에서</h1>
        <p className="intro">공고 수집부터 조건 비교, 근거 확인까지 이어지는 대시보드를 준비하고 있습니다.</p>
        <section className="section" aria-labelledby="collection-title">
          <div className="section-heading"><h2 id="collection-title">자동 수집 상태</h2><span>연결 전</span></div>
          <dl className="source-list">
            <div><dt>고용24 공식 API</dt><dd>이용 승인·약관·쿼터 확인 대기</dd></div>
            <div><dt>사람인 공식 API</dt><dd>이용 승인·약관·쿼터 확인 대기</dd></div>
          </dl>
          <p className="note">수집·AI 분석·자동 저장·이메일 알림은 아직 실행되지 않습니다.</p>
        </section>
        <section className="section" aria-labelledby="jobs-title">
          <div className="section-heading"><h2 id="jobs-title">수집된 공고</h2><span>미수집</span></div>
          <DataState kind="empty" title="아직 수집된 공고가 없습니다" description="다음 단계에서 사용자 조건과 공식 API의 이용 범위를 확인한 뒤 자동 수집을 연결합니다." />
        </section>
      </main>
      <footer>적합도는 사용자 조건과의 비교이며 채용 확률이 아닙니다.</footer>
    </>
  )
}
