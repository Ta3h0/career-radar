import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { Dashboard } from './Dashboard.tsx'

it('communicates that automation has not run and renders no job claims', () => {
  const markup = renderToStaticMarkup(createElement(Dashboard))
  expect(markup).toContain('아직 수집된 공고가 없습니다')
  expect(markup).toContain('수집·AI 분석·자동 저장·이메일 알림은 아직 실행되지 않습니다.')
  expect(markup).toContain('href="#main-content"')
  expect(markup).not.toContain('채용 확률 90%')
})
