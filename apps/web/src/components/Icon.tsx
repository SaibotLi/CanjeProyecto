export type IconName = 'menu' | 'points' | 'gift' | 'user' | 'arrow' | 'scan' | 'history' | 'settings'
const paths: Record<IconName, string> = {
  menu: 'M4 5h16M4 12h16M4 19h16',
  points: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  gift: 'M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8C4 8 5 1 9 3c2 1 3 5 3 5s1-4 3-5c4-2 5 5-3 5',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  scan: 'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M7 12h10',
  history: 'M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2',
  settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
}
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
