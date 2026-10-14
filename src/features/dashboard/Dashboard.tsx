import { useRef, useState } from 'react'
import type { JobPosting } from '../../domain/jobs.ts'
import { Icon } from '../../components/Icon.tsx'
import { JobList } from './JobList.tsx'
import type { JobListState, JobView } from './JobList.tsx'

const views: readonly { id: JobView; label: string }[] = [{ id: 'all', label: '전체 공고' }, { id: 'analysis', label: '분석 완료' }, { id: 'saved', label: '저장한 공고' }]
export function Dashboard({ jobs = [], collectionState = 'not-connected' }: { jobs?: readonly JobPosting[]; collectionState?: JobListState }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [view, setView] = useState<JobView>('all')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [region, setRegion] = useState('all')
  const [employment, setEmployment] = useState('all')
  const [sort, setSort] = useState('recent')
  const searchRef = useRef<HTMLInputElement>(null)
  const jobsRef = useRef<HTMLElement>(null)
  const automationRef = useRef<HTMLElement>(null)
  const guideRef = useRef<HTMLElement>(null)
  const isFiltered = Boolean(query.trim() || source !== 'all' || region !== 'all' || employment !== 'all')
  // Analysis and saved-job stores are not connected. No results are fabricated.
  const visibleJobs = (view === 'all' ? jobs : []).filter((job) => {
    const term = query.trim().toLocaleLowerCase('ko-KR')
    const matchesQuery = !term || [job.title, job.company, ...(job.roles ?? [])].some((value) => value?.toLocaleLowerCase('ko-KR').includes(term))
    return matchesQuery && (source === 'all' || job.sources.some((item) => item.source === source)) && (region === 'all' || job.regions?.some((item) => item === region || item.startsWith(`${region} >`))) && (employment === 'all' || job.employmentTypes?.includes(employment))
  }).sort((a, b) => sort === 'closing' ? (a.closesAt ?? '9999').localeCompare(b.closesAt ?? '9999') : (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
  const jumpToJobs = (nextView: JobView = 'all') => { setView(nextView); setMenuOpen(false); jobsRef.current?.focus(); jobsRef.current?.scrollIntoView({ block: 'start' }) }
  const showFilters = () => { setFiltersOpen(true); jumpToJobs(); searchRef.current?.focus() }
  const showGuide = () => { setGuideOpen(true); setMenuOpen(false); guideRef.current?.focus(); guideRef.current?.scrollIntoView({ block: 'start' }) }
  const resetFilters = () => { setQuery(''); setSource('all'); setRegion('all'); setEmployment('all'); setSort('recent') }
  return <div className="workspace-shell">
    <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
    <aside className={`sidebar${menuOpen ? ' is-open' : ''}`} aria-label="워크스페이스 탐색">
      <div className="brand-row"><a className="brand" href="/" aria-label="Career Radar 홈"><span className="brand-mark"><Icon name="radar" size={26} /></span><span>Career Radar<span className="brand-caption">다음 기회를 발견하는 곳</span></span></a><button className="mobile-menu" aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menuOpen} aria-controls="sidebar-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button></div>
      <div className="sidebar-content" id="sidebar-navigation"><p className="navigation-label">워크스페이스</p><nav className="main-navigation" aria-label="주 탐색"><a className="nav-item is-active" href="#main-content" aria-current="page" onClick={() => setMenuOpen(false)}><Icon name="dashboard" /><span>대시보드</span></a><button className="nav-item" onClick={() => jumpToJobs()}><Icon name="search" /><span>공고 탐색</span></button><button className="nav-item" onClick={() => jumpToJobs('saved')}><Icon name="bookmark" /><span>저장한 공고</span></button><button className="nav-item" onClick={showFilters}><Icon name="sliders" /><span>탐색 조건</span></button><button className="nav-item" onClick={() => { setMenuOpen(false); automationRef.current?.focus(); automationRef.current?.scrollIntoView({ block: 'start' }) }}><Icon name="activity" /><span>수집 상태</span></button></nav>
        <div className="sidebar-bottom"><div className="sidebar-automation"><Icon name="radar" size={22} /><strong>탐색은 가볍게,<br />기회는 놓치지 않게.</strong><p>연결을 마치면 새로운 공고를<br />이곳에서 확인할 수 있어요.</p><span className="sidebar-status"><span />자동 수집 연결 전</span></div><div className="workspace-identity"><span className="identity-symbol"><Icon name="shield" size={18} /></span><div><strong>개인 워크스페이스</strong><span>Career Radar</span></div></div></div>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="topbar"><div className="breadcrumb"><span>워크스페이스</span><Icon name="chevron" size={13} /><strong>대시보드</strong></div><div className="topbar-actions"><span className="connection-indicator"><span />데이터 연결 전</span><button className="text-button" onClick={showGuide}>시작 안내<Icon name="arrow" size={16} /></button></div></header>
      <main id="main-content" tabIndex={-1}>
        <div className="page-heading"><div><h1>오늘의 채용 대시보드</h1><p>새로운 기회를 모으고, 나에게 맞는 공고를 살펴보세요.</p></div><button className="button button-primary" onClick={showFilters}><Icon name="sliders" size={18} />탐색 조건 설정</button></div>
        <section className="welcome-banner" aria-labelledby="welcome-title"><span className="welcome-symbol"><Icon name="link" size={24} /></span><div><h2 id="welcome-title">첫 공고를 받을 준비를 해볼까요?</h2><p>수집 서비스를 연결하면 신규 공고와 처리 상태를 한곳에서 확인할 수 있습니다.</p></div><button className="welcome-action" onClick={showGuide}>연결 순서 보기<Icon name="arrow" size={17} /></button></section>
        <dl className="overview-strip" aria-label="공고 처리 현황"><div><dt>수집된 공고<Icon name="search" size={17} /></dt><dd>{jobs.length ? `${jobs.length}개` : '—'}</dd><span>{jobs.length ? '전달받은 공고 기준' : '수집 연결 전'}</span></div><div><dt>분석 완료<Icon name="sparkles" size={17} /></dt><dd>—</dd><span>AI 분석 연결 전</span></div><div><dt>저장한 공고<Icon name="bookmark" size={17} /></dt><dd>—</dd><span>저장 기능 연결 전</span></div><div><dt>마지막 수집<Icon name="clock" size={17} /></dt><dd className="overview-date">아직 없음</dd><span>실행 이력 없음</span></div></dl>
        <div className="dashboard-grid"><div className="dashboard-primary">
          <section className="jobs-panel panel" id="jobs-panel" ref={jobsRef} tabIndex={-1} aria-labelledby="jobs-title">
            <div className="panel-heading"><div className="heading-with-count"><h2 id="jobs-title">공고 목록</h2><span className="count-label">{visibleJobs.length}개</span></div><span className="panel-meta">출처와 근거를 함께 확인하세요</span></div>
            <div className="job-views" role="group" aria-label="공고 보기">{views.map((item) => <button key={item.id} className={`view-button${view === item.id ? ' is-selected' : ''}`} aria-pressed={view === item.id} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
            <div className="job-toolbar"><div className="search-field"><Icon name="search" size={19} /><label htmlFor="job-search" className="visually-hidden">공고 검색</label><input id="job-search" ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="공고명, 기업명, 직무 검색" autoComplete="off" /></div><button className={`filter-toggle${filtersOpen ? ' is-selected' : ''}`} aria-expanded={filtersOpen} aria-controls="job-filters" onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="sliders" size={18} />필터{isFiltered && <span className="filter-active-dot" />}</button></div>
            <div className="filter-fields" id="job-filters" hidden={!filtersOpen}><label>출처<select aria-label="출처" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">전체 출처</option><option value="saramin">사람인</option><option value="work24">고용24</option></select></label><label>지역<select aria-label="지역" value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">전체 지역</option>{['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'].map((value) => <option key={value}>{value}</option>)}</select></label><label>고용형태<select aria-label="고용형태" value={employment} onChange={(event) => setEmployment(event.target.value)}><option value="all">전체 형태</option><option>정규직</option><option>계약직</option><option>인턴직</option><option>프리랜서</option></select></label><button className="text-button reset-button" onClick={resetFilters}>조건 초기화</button><p className="filter-session-note">현재 화면에만 적용됩니다. 새로고침하면 검색 조건이 초기화됩니다.</p></div>
            <div className="list-options"><span>{view === 'saved' ? '저장 기능 연결 후 사용할 수 있습니다' : view === 'analysis' ? '분석 결과가 연결되면 표시됩니다' : '제공된 공고 정보만 표시합니다'}</span><label><span className="visually-hidden">공고 정렬</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">최신 등록순</option><option value="closing">마감일순</option></select></label></div>
            <JobList jobs={visibleJobs} state={collectionState} view={view} filtered={isFiltered} onGuide={showGuide} onReset={resetFilters} />
            <div className="list-footnote"><Icon name="shield" size={15} /><span>적합도는 사용자 조건과의 비교이며 채용 확률이 아닙니다.</span></div>
          </section>
          <section className="search-summary" aria-label="현재 탐색 조건"><div className="search-summary-heading"><Icon name="sliders" size={18} /><strong>현재 탐색 조건</strong><button className="text-button" onClick={showFilters}>조정하기<Icon name="arrow" size={15} /></button></div><dl><div><dt>검색어</dt><dd>{query.trim() || '설정 안 함'}</dd></div><div><dt>희망 지역</dt><dd>{region === 'all' ? '전체 지역' : region}</dd></div><div><dt>공고 출처</dt><dd>{source === 'saramin' ? '사람인' : source === 'work24' ? '고용24' : '전체 출처'}</dd></div></dl></section>
        </div><aside className="dashboard-rail" aria-label="자동화 연결 정보">
          <section className="automation-panel panel" id="automation-panel" ref={automationRef} tabIndex={-1} aria-labelledby="automation-title"><div className="panel-heading"><h2 id="automation-title">자동화 상태</h2><span className="status-pill status-warning">연결 전</span></div><p className="rail-description">새 공고가 들어오는 흐름을<br />차근차근 연결해 보세요.</p><div className="provider-list"><details className="provider"><summary><span className="provider-symbol">S</span><span className="provider-copy"><strong>사람인</strong><span>이용 승인 필요</span></span><Icon name="chevron" size={16} /></summary><div className="provider-guide"><p>공식 API 이용승인과 키 발급 후 연결할 수 있습니다.</p><a href="https://oapi.saramin.co.kr/join" target="_blank" rel="noopener noreferrer">이용신청 화면<Icon name="arrow" size={15} /><span className="visually-hidden"> (새 창)</span></a></div></details><details className="provider"><summary><span className="provider-symbol provider-symbol-neutral">W</span><span className="provider-copy"><strong>고용24</strong><span>이용 자격 확인 필요</span></span><Icon name="chevron" size={16} /></summary><div className="provider-guide"><p>기업회원 자격과 공식 API 이용승인을 먼저 확인해야 합니다.</p><a href="https://www.work24.go.kr/cm/e/a/0110/selectOpenApiIntro.do" target="_blank" rel="noopener noreferrer">공식 이용 안내<Icon name="arrow" size={15} /><span className="visually-hidden"> (새 창)</span></a></div></details></div><ol className="automation-flow"><li><span className="flow-node"><Icon name="search" size={15} /></span><div><strong>신규 공고 수집</strong><span>서비스 연결 대기</span></div></li><li><span className="flow-node"><Icon name="sliders" size={15} /></span><div><strong>조건 비교 · 분석</strong><span>공고 수집 후 진행</span></div></li><li><span className="flow-node"><Icon name="mail" size={15} /></span><div><strong>일일 요약 알림</strong><span>저장 · 수신 동의 연결 전</span></div></li></ol><div className="automation-note"><Icon name="clock" size={17} /><p>마지막 실행 이력이 없습니다.<br />연결 후 실제 처리 시각이 표시됩니다.</p></div></section>
          <section className="connection-guide panel" ref={guideRef} tabIndex={-1} aria-labelledby="guide-title"><div className="guide-heading"><span className="guide-symbol"><Icon name="link" size={20} /></span><h2 id="guide-title">연결부터 시작해요</h2></div><p>공고 수집이 연결되면<br />이 대시보드가 준비된 기회로 채워집니다.</p><button className="text-button" aria-expanded={guideOpen} aria-controls="setup-guide" onClick={() => setGuideOpen(!guideOpen)}>{guideOpen ? '안내 접기' : '시작 순서 확인'}<Icon name="chevron" size={16} className={guideOpen ? 'rotate-down' : ''} /></button><div id="setup-guide" hidden={!guideOpen}><ol className="setup-steps"><li><strong>공식 서비스 이용승인</strong><span>개인 이용 여부와 데이터 이용 범위를 확인합니다.</span></li><li><strong>나에게 맞는 탐색 조건</strong><span>관심 직무와 지역을 정합니다.</span></li><li><strong>저장 · 분석 · 알림 연결</strong><span>무료 이용 조건과 수신 동의를 확인합니다.</span></li></ol><p className="setup-disclosure">수집·AI 분석·자동 저장·이메일 알림은 아직 실행되지 않습니다.</p></div></section>
        </aside></div>
        <footer className="dashboard-footer"><span>Career Radar</span><span>다음 기회를 찾는 나만의 레이더</span></footer>
      </main>
    </div>
  </div>
}
