import { useEffect, useRef, useState } from 'react';
import type { CatalogEntry, Platform } from '@askjamie/catalog-schema';
import { applicationGuide, saveFeedback, clearFeedback, type Outcome } from '@askjamie/api/application';
export function ApplicationGuide({entry,platform,onBack}:{entry:CatalogEntry;platform:Platform;onBack:()=>void}) {
  const [copied,setCopied]=useState('');
  const [tried,setTried]=useState(false);
  const [feedback,setFeedback]=useState('');
  const [expired,setExpired]=useState(false);
  const [downloading,setDownloading]=useState(false);
  const [downloadError,setDownloadError]=useState('');
  const titleRef=useRef<HTMLHeadingElement>(null);
  const activeRef=useRef(true);
  useEffect(()=>{activeRef.current=true;titleRef.current?.focus();return ()=>{activeRef.current=false;};},[]);
  function currentGuide() {
    try { return applicationGuide(entry,platform); }
    catch { setExpired(true); return null; }
  }
  let guide:ReturnType<typeof applicationGuide>;
  try {if(expired)throw new Error('Review expired');guide=applicationGuide(entry,platform);} catch {return <><p role="alert" className="status">This skill needs a fresh review. Please reload before continuing.</p><button onClick={onBack}>Back to matches</button></>;}
  async function copy(text:string) {
    if(!currentGuide())return;
    try {await navigator.clipboard.writeText(text);setCopied('Copied. You can paste this into your agent.');}
    catch {setCopied('Copy is unavailable in this browser. Select and copy the text below.');}
  }
  async function download() {
    const current=currentGuide();
    if(!current || downloading)return;
    setDownloading(true);setDownloadError('');
    try {
      const response=await fetch(import.meta.env.BASE_URL+current.downloadPath,{cache:'no-store'});
      if(!response.ok)throw new Error('Download unavailable');
      const file=await response.blob();
      if(!activeRef.current || !currentGuide())return;
      const url=URL.createObjectURL(file);
      const link=document.createElement('a');
      link.href=url;link.download='SKILL.md';
      document.body.append(link);
      try {link.click();} finally {link.remove();setTimeout(()=>URL.revokeObjectURL(url),0);}
    } catch {
      if(activeRef.current)setDownloadError('The skill could not be downloaded. Please try again.');
    } finally {
      if(activeRef.current)setDownloading(false);
    }
  }
  function record(outcome:Outcome) {
    try {saveFeedback(localStorage,entry,platform,outcome);setFeedback(outcome==='not-yet' ? 'Saved in this browser. Try giving your agent a small example and checking what information is missing.' : 'Thank you. Your response is saved in this browser.');}
    catch {setFeedback('Your browser could not save this response. No feedback was recorded.');}
  }
  return <section className="application" aria-labelledby="application-title">
    <button className="quiet" onClick={onBack}>Back to matches</button>
    <p className="trust-label">Reviewed for this catalog</p><h2 id="application-title" tabIndex={-1} ref={titleRef}>{entry.displayName}</h2><p>{entry.plainDescription}</p>
    <p className="muted">You’ll get a draft to review, using material you choose to share. Your agent may ask for missing details. The skill does not act in other tools for you.</p>
    <ol className="installation">
      <li><h3>Save the skill</h3><p>Download this small instruction file. Keep its name as <code>SKILL.md</code>.</p><button className="primary" disabled={downloading} onClick={()=>void download()}>{downloading ? 'Preparing download…' : 'Download skill'}</button>{downloadError ? <p role="alert">{downloadError}</p> : null}</li>
      <li><h3>Add it to {guide.platformName}</h3><p>Open your project in {guide.platformName}. Attach the downloaded file and paste this request. If attachments are unavailable, ask your agent to help you save the file at <code>{guide.path}</code>.</p><pre>{guide.request}</pre><button onClick={()=>void copy(guide.request)}>Copy setup request</button></li>
      <li><h3>Try one small task</h3><p>After your agent confirms the skill is available, paste the prompt below and supply a small example you are allowed to share.</p><pre>{guide.tryPrompt}</pre><button onClick={()=>void copy(guide.tryPrompt)}>Copy first-task prompt</button><p className="small muted">Check the result for missing facts and mistakes before you use it.</p></li>
    </ol>
    {copied ? <p role="status" className="status">{copied}</p> : null}
    <p className="small"><a href={guide.docsUrl} target="_blank" rel="noreferrer">Official {guide.platformName} setup guidance</a></p>
    <section className="outcome"><h3>Did it make the task easier?</h3>
      {!tried ? <><p>Come back after you have tried the skill.</p><button onClick={()=>setTried(true)}>I’ve tried it</button></> : <div className="actions"><button onClick={()=>record('helped')}>Yes, it helped</button><button onClick={()=>record('partly')}>Partly</button><button onClick={()=>record('not-yet')}>Not yet</button></div>}
      {feedback ? <p role="status" className="status">{feedback}</p> : null}
      <p className="small muted">Feedback stays in this browser. It contains the skill, your agent, and your response—not your task text.</p>
      <button className="quiet small" onClick={()=>{try{clearFeedback(localStorage);setFeedback('Saved feedback cleared from this browser.');}catch{setFeedback('Your browser could not clear saved feedback.');}}}>Clear saved feedback</button>
    </section>
  </section>;
}
