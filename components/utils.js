export const cls = (...c) => c.filter(Boolean).join(" ");

export function timeAgo(input) {
  // 1. 입력값이 없으면 'Just now' 반환 (안전장치 1)
  if (!input) return 'Just now';

  const date = new Date(input);
  
  // 2. 날짜 변환이 실패(Invalid Date)했으면 'Just now' 반환 (안전장치 2)
  if (isNaN(date.getTime())) return 'Just now';

  const now = new Date();
  const seconds = Math.round((now - date) / 1000); // 여기서 음수가 나오거나 NaN이 나오면 안 됨

  // 3. 미래의 시간이거나 계산 불가면 'Just now' 처리 (안전장치 3)
  if (isNaN(seconds) || seconds < 0) return 'Just now';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (seconds < 60) return rtf.format(-seconds, 'second');
  
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');

  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');

  const days = Math.round(hours / 24);
  if (days < 7) return rtf.format(-days, 'day');

  const weeks = Math.round(days / 7);
  if (weeks < 4) return rtf.format(-weeks, 'week');

  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, 'month');

  const years = Math.round(days / 365);
  return rtf.format(-years, 'year');
}

export const makeId = (p) => `${p}${Math.random().toString(36).slice(2, 10)}`;
