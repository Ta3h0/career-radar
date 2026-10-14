import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Dashboard } from './Dashboard.tsx'
import { JobList } from './JobList.tsx'

it('communicates that automation has not run and renders no job claims', () => {
  const markup = renderToStaticMarkup(createElement(Dashboard))
  expect(markup).toContain('아직 수집된 공고가 없습니다')
  expect(markup).toContain('수집·AI 분석·자동 저장·이메일 알림은 아직 실행되지 않습니다.')
  expect(markup).toContain('href="#main-content"')
  expect(markup).not.toContain('채용 확률 90%')
})

it('provides explicit loading and recoverable error states', () => {
  const base = { jobs: [], view: 'all' as const, filtered: false, onGuide: () => {}, onReset: () => {} }
  const loading = renderToStaticMarkup(createElement(JobList, { ...base, state: 'loading' }))
  expect(loading).toContain('aria-label="공고를 불러오는 중"')
  expect(loading).not.toContain('아직 수집된 공고가 없습니다')
  const failure = renderToStaticMarkup(createElement(JobList, { ...base, state: 'error' }))
  expect(failure).toContain('role="alert"')
  expect(failure).toContain('연결 상태 확인')
})
