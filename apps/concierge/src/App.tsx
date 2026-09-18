import { useEffect, useRef, useState } from 'react';
import { Header, Arrow } from '@askjamie/ui-kit';
import { platformNames, type CatalogEntry, type Platform } from '@askjamie/catalog-schema';
import { discover, fetchCatalog, type Match } from '@askjamie/api/discovery';
import { ApplicationGuide } from './ApplicationGuide';

const examples = ['Summarize meeting notes','Organize an expense report','Review a code change'];
export function App() {
  const [catalog,setCatalog] = useState<CatalogEntry[] | null>(null);
  const [loadError,setLoadError] = useState('');
  const [goal,setGoal] = useState('');
  const [platform,setPlatform] = useState<Platform | ''>('');
  const [prompt,setPrompt] = useState('');
  const [matches,setMatches] = useState<Match[] | null>(null);
  const [selected,setSelected] = useState<CatalogEntry | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { let active=true; fetchCatalog(import.meta.env.BASE_URL).then(v=>{if(active)setCatalog(v);}).catch(()=>{if(active)setLoadError('The skill catalog is unavailable. Please reload to try again.');}); return ()=>{active=false;}; },[]);
  useEffect(()=>{if(matches) resultRef.current?.focus();},[matches]);
  function search(event:React.FormEvent) {
    event.preventDefault();
    if(!goal.trim()){setPrompt('Tell me a little about the task you would like help with.');return;}
    if(!platform){setPrompt('Which agent will you use? Choose one below so I can give you the right guidance.');return;}
    if(!catalog)return;
    setPrompt('');setMatches(discover(catalog,goal,platform));
  }
  function startAgain() { setMatches(null);setSelected(null);setPrompt(''); }
  return <><a className="skip-link" href="#main">Skip to guidance</a><Header><a href="#how-it-works">How it works</a></Header>
    <main id="main" className="concierge-layout">
      <section className="conversation">
        <h1>What would you like to get done?</h1>
        <p className="intro">Tell me about a task. I’ll help you find a reviewed skill and show you how to use it.</p>
        {selected && platform ? <ApplicationGuide entry={selected} platform={platform} onBack={()=>setSelected(null)}/> : matches === null ? <>
          <form className="intake" onSubmit={search}>
            <h2>Start with the work, in your own words.</h2>
            <label htmlFor="goal">Your goal</label>
            <textarea id="goal" maxLength={2000} value={goal} onChange={e=>setGoal(e.target.value)} placeholder="For example, turn my meeting notes into clear next steps."/>
            <label htmlFor="platform">Where will you use it?</label>
            <select id="platform" value={platform} onChange={e=>setPlatform(e.target.value as Platform | '')}><option value="">Choose your agent</option><option value="claude">Claude Code</option><option value="copilot">GitHub Copilot</option></select>
            {prompt ? <p className="status" role="status">{prompt}</p> : null}
            {loadError ? <p className="status error" role="alert">{loadError}</p> : null}
            <div className="submit-row"><button className="primary" disabled={!catalog}> {catalog ? 'Find a skill' : loadError ? 'Catalog unavailable' : 'Loading catalog…'} <Arrow/></button></div>
          </form>
          <p className="example-label">Need a starting point? Try one of these.</p><div className="examples">{examples.map(value=><button key={value} onClick={()=>{setGoal(value);document.getElementById('goal')?.focus();}}>{value}</button>)}</div>
        </> : <section className="results" aria-live="polite">
          <div className="your-goal"><span className="small muted">Your goal · {platform ? platformNames[platform] : ''}</span><p>{goal}</p></div>
          <h2 tabIndex={-1} ref={resultRef}>{matches.length ? matches.length === 1 ? 'I found a good fit.' : 'These are the closest fits.' : 'I could not find a good fit yet.'}</h2>
          {matches.length ? <ol className="match-list">{matches.map(({entry,reason})=><li key={entry.id}><p className="trust-label">Reviewed for this catalog</p><h3>{entry.displayName}</h3><p>{reason}</p><p className="small muted">Checked {new Date(entry.trustLastCheckedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}. Review the result before using it.</p><button className="primary" onClick={()=>setSelected(entry)}>Show me how to use it <Arrow/></button></li>)}</ol> : <p>This small catalog may not cover your task. Try describing the result you need. Guided contributions are planned for a later release.</p>}
          <button className="quiet" onClick={startAgain}>Describe another task</button>
        </section>}
      </section>
      <aside id="how-it-works" className="guidance"><h2>A little guidance.<br/>A better result.</h2><ol>
        <li><div><h3>Describe your task</h3><p>Tell me what you want to get done, in your own words. Include any important details.</p></div></li>
        <li><div><h3>Find a good fit</h3><p>I’ll match your goal with a reviewed skill and show you how to use it in your chosen agent.</p></div></li>
        <li><div><h3>Put it to work</h3><p>Follow the step-by-step guidance to complete your task with confidence.</p></div></li>
      </ol><p className="privacy small">Your goal stays in this browser.</p></aside>
    </main></>;
}
