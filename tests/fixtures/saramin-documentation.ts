// Source: https://oapi.saramin.co.kr/guide/job-search (reviewed 2026-10-14).
// Selected factual fields from its historical JSON example, not a live response.
// Names/titles are replaced, unrelated fields omitted. No API source code copied.
export const documentationExample = {
  jobs: {
    count: 2, start: 1, total: '7629',
    job: [
      {
        id: '27614114', active: 1,
        url: 'http://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=27614114&utm_source=job-search-api&utm_medium=api&utm_campaign=saramin-job-search-api',
        company: { detail: { name: '문서 예시 재구성 기업 A' } },
        position: {
          title: '문서 예시 재구성 공고 A',
          location: { code: '101050,101060,101070', name: '서울 > 관악구,서울 > 광진구,서울 > 구로구' },
          'job-type': { code: '1', name: '정규직' },
          'experience-level': { code: 2, min: 2, max: 3, name: '경력 2~3년' },
        },
        salary: { code: '6', name: '1,800~2,000만원' },
        'posting-timestamp': '1559191564', 'modification-timestamp': '1559191564',
        'expiration-timestamp': '1561820399', 'close-type': { code: '1' },
      },
      {
        id: '27614112', active: 1,
        url: 'http://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=27614112',
        company: { detail: { name: '문서 예시 재구성 기업 B' } },
        position: {
          title: '문서 예시 재구성 공고 B',
          location: { code: '101070', name: '서울 > 구로구' },
          'job-type': { code: '1', name: '정규직' },
          'experience-level': { code: 1, min: 0, max: 0, name: '신입' },
        },
        salary: { code: '4', name: '1,400~1,600만원' },
        'posting-timestamp': '1559175921', 'modification-timestamp': '1559175921',
        'expiration-timestamp': '1561820399', 'close-type': { code: '1' },
      },
    ],
  },
}
