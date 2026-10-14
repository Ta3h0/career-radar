export type IconName = 'radar' | 'dashboard' | 'search' | 'bookmark' | 'sliders' | 'activity' | 'arrow' | 'chevron' | 'clock' | 'mail' | 'sparkles' | 'link' | 'menu' | 'close' | 'shield'
const paths: Record<Exclude<IconName, 'radar'>, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  search: 'M21 21l-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
  sliders: 'M4 7h5 M13 7h7 M4 17h11 M19 17h1 M9 4v6 M15 14v6',
  activity: 'M2 12h5l3-8 4 16 3-8h5',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  chevron: 'M9 5l7 7-7 7',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
  mail: 'M3 5h18v14H3z M3 5l9 7 9-7',
  sparkles: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  menu: 'M4 6h16 M4 12h16 M4 18h16', close: 'M6 6l12 12 M18 6L6 18',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
}
export function Icon({ name, size = 20, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`icon ${className}`}>{name === 'radar' ? <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6.5-6.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></> : <path d={paths[name]} />}</svg>
}
