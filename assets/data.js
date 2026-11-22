// Data for the charts, taken from `git log --date=short`
// (dates only — no times, messages or paths).
// Migration dates = the day each file first entered git
// (`git log --diff-filter=A`), never the number in the file name.
window.SITE_DATA = {
  asOf: '2026-11-19',
  start: '2026-09-21',
  // Ovrina private repo · commits per day (date only)
  commits: {
    '2026-09-21': 1, '2026-09-23': 4, '2026-09-24': 4, '2026-09-25': 4, '2026-09-26': 2,
    '2026-09-27': 3, '2026-09-28': 3, '2026-09-29': 3, '2026-09-30': 3, '2026-10-01': 1,
    '2026-10-02': 1, '2026-10-05': 3, '2026-10-06': 2, '2026-10-07': 3, '2026-10-10': 1,
    '2026-10-11': 2, '2026-10-12': 1, '2026-10-14': 1, '2026-10-18': 1, '2026-10-20': 2,
    '2026-10-21': 3, '2026-10-22': 1, '2026-10-23': 1, '2026-10-24': 2, '2026-10-25': 1,
    '2026-10-28': 1, '2026-11-01': 1, '2026-11-03': 2, '2026-11-04': 3, '2026-11-05': 5,
    '2026-11-06': 3, '2026-11-09': 3, '2026-11-10': 1, '2026-11-11': 2, '2026-11-13': 2,
    '2026-11-17': 1, '2026-11-18': 1,
  },
  // Build numbers as they appear in pubspec.yaml history (all of them; +2 never appears)
  builds: [
    { date: '2026-09-21', label: '1.0.0+1' },
    { date: '2026-10-07', label: '1.0.0+3' },
    { date: '2026-10-10', label: '1.0.0+4' },
    { date: '2026-10-12', label: '1.0.0+5' },
    { date: '2026-10-18', label: '1.0.0+6' },
    { date: '2026-10-20', label: '1.0.0+7' },
    { date: '2026-10-23', label: '1.0.0+8' },
    { date: '2026-10-28', label: '1.0.0+9' },
    { date: '2026-11-11', label: '1.1.0+10, +11' },
  ],
  // Releases. status: 'done' | 'planned'; short: label for narrow charts
  releases: [
    { date: '2026-11-05', status: 'done', ko: '출시', en: 'Launch' },
    { date: '2026-11-19', status: 'done', ko: '1.1 출시', en: '1.1 released', short: '1.1' },
  ],
  // Work outside the code
  offcode: [
    { date: '2026-09-28', ko: '이용약관·개인정보처리방침 첫 버전', en: 'Terms and Privacy Policy v1' },
    { date: '2026-10-07', ko: '개인정보처리방침 개정', en: 'Privacy Policy revised' },
    { date: '2026-10-27', ko: '스토어 소개 문구 1.0 (한국어·영어)', en: 'Store listing 1.0 (Korean, English)' },
    { date: '2026-11-11', ko: '스토어 소개 문구 1.1', en: 'Store listing 1.1' },
    { date: '2026-11-19', ko: '약관·방침 개정 공고, Instagram에서 알리기 시작', en: 'Terms and Privacy Policy revision notice; started promoting on Instagram' },
  ],
};
