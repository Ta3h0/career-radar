import type { JobPosting } from '../../domain/jobs.ts'
import { Icon } from '../../components/Icon.tsx'
export type JobView = 'all' | 'analysis' | 'saved'
export type JobListState = 'not-connected' | 'loading' | 'error' | 'ready'
const dateLabel = (value: string | null) => !value || !Number.isFinite(Date.parse(value)) ? '미확인' : new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(value))
function safeUrl(job: JobPosting): string | null {
  try {
    const url = new URL(job.sources[0]?.originalUrl ?? '')
    return url.protocol === 'https:' && !url.username && !url.password && ['www.saramin.co.kr', 'saramin.co.kr', 'www.work24.go.kr', 'm.work24.go.kr'].includes(url.hostname) ? url.href : null
  } catch { return null }
}
export function JobList({ jobs, state, view, filtered, onGuide, onReset }: { jobs: readonly JobPosting[]; state: JobListState; view: JobView; filtered: boolean; onGuide: () => void; onReset: () => void }) {
  const title = view === 'saved' ? '아직 저장한 공고가 없습니다' : view === 'analysis' ? '아직 분석된 공고가 없습니다' : filtered ? '검색 조건에 맞는 공고가 없습니다' : '아직 수집된 공고가 없습니다'
  const description = view === 'saved' ? '수집된 공고 중 관심 있는 기회를 모아볼 공간입니다.' : view === 'analysis' ? '공고를 수집하고 분석을 연결하면 비교 결과를 확인할 수 있습니다.' : filtered ? '검색어나 필터를 조정해 보세요. 수집 연결 전에는 결과가 표시되지 않습니다.' : '수집 서비스를 연결하면 새로운 기회가 이곳에 모입니다.'
  return <table className="jobs-table"><caption className="visually-hidden">채용공고 목록</caption><thead><tr><th scope="col">공고 · 기업</th><th scope="col">지역 · 경력</th><th scope="col">마감일</th><th scope="col">분석 상태</th></tr></thead><tbody>{state === 'loading' ? <tr><td colSpan={4}><div className="list-loading" role="status" aria-label="공고를 불러오는 중">{[1, 2, 3].map((item) => <div className="skeleton-row" key={item}><span /><span /></div>)}</div></td></tr> : state === 'error' ? <tr><td colSpan={4}><div className="list-empty" role="alert"><Icon name="activity" size={36} /><h3>공고를 불러오지 못했습니다</h3><p>연결 상태를 확인한 뒤 다시 시도해 주세요.</p><button className="button button-secondary" onClick={onGuide}>연결 상태 확인<Icon name="arrow" size={16} /></button></div></td></tr> : jobs.length ? jobs.map((job) => {
    const url = safeUrl(job)
    return <tr key={job.id}><td><span className="job-company">{job.company ?? '기업명 미확인'}</span>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{job.title ?? '제목 미확인'}<span className="visually-hidden"> (원문, 새 창)</span></a> : <strong>{job.title ?? '제목 미확인'}</strong>}<span className="mobile-job-region">{job.regions?.join(', ') ?? '지역 미확인'}</span></td><td><span>{job.regions?.join(', ') ?? '지역 미확인'}</span><small>{job.experienceYears?.min !== null && job.experienceYears?.min !== undefined ? `최소 ${job.experienceYears.min}년` : '경력 미확인'}</small></td><td>{dateLabel(job.closesAt)}</td><td><span className="status-pill">미분석</span></td></tr>
  }) : <tr><td colSpan={4}><div className="list-empty"><div className="empty-radar"><Icon name="radar" size={48} /></div><h3>{title}</h3><p>{description}</p><button className="button button-secondary" onClick={filtered ? onReset : onGuide}>{filtered ? '검색 조건 초기화' : '수집 연결 안내'}<Icon name="arrow" size={16} /></button></div></td></tr>}</tbody></table>
}
