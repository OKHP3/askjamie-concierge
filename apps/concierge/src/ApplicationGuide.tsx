import { useState } from 'react';
import type { CatalogEntry, Platform } from '@askjamie/catalog-schema';
import { applicationGuide, saveFeedback, clearFeedback, type Outcome } from '@askjamie/api/application';
export function ApplicationGuide({entry,platform,onBack}:{entry:CatalogEntry;platform:Platform;onBack:()=>void}) {
  const [copied,setCopied]=useState('');
  const [tried,setTried]=useState(false);
  const [feedback,setFeedback]=useState('');
  let guide:ReturnType<typeof applicationGuide>;
  try {guide=applicationGuide(entry,platform);} catch {return <><p role="alert" className="status">This skill needs a fresh review. Please reload before continuing.</p><button onClick={onBack}>Back to matches</button></>;}
  async function copy(text:string) {
    try {await navigator.clipboard.writeText(text);setCopied('Copied. You can paste this into your agent.');}
    catch {setCopied('Copy is unavailable in this browser. Select and copy the text below.');}
  }
  function record(outcome:Outcome) {
    try {saveFeedback(localStorage,entry,platform,outcome);setFeedback(outcome==='not-yet' ? 'Saved in this browser. Try giving your agent a small example and checking what information is missing.' : 'Thank you. Your response is saved in this browser.');}
    catch {setFeedback('Your browser could not save this response. No feedback was recorded.');}
  }
  return <section className="application" aria-labelledby="application-title">
    <button className="quiet" onClick={onBack}>Back to matches</button>
    <p className="trust-label">Reviewed for this catalog</p><h2 id="application-title">{entry.displayName}</h2><p>{entry.plainDescription}</p>
    <p className="muted">You’ll get a draft to review, using material you choose to share. Your agent may ask for missing details. The skill does not act in other tools for you.</p>
    <ol className="installation">
      <li><h3>Save the skill</h3><p>Download this small instruction file. Keep its name as <code>SKILL.md</code>.</p><a className="primary" href={import.meta.env.BASE_URL+'skills/'+entry.id+'/SKILL.md'} download="SKILL.md">Download skill</a></li>
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
