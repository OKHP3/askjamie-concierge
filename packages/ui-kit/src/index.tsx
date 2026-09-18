import type { ReactNode } from 'react';
export function Header({ surface='Concierge', children }: { surface?:string; children?:ReactNode }) {
  return <header className="site-header"><a className="wordmark" href="./" aria-label={'AskJamie ' + surface}><strong>AskJamie</strong><span>{surface}</span></a>{children}</header>;
}
export function Arrow() { return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 5l7 7-7 7"/></svg>; }
export function Status({ children }: { children:ReactNode }) { return <p className="status" role="status">{children}</p>; }
