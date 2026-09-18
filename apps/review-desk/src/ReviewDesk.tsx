import { useEffect,useState } from 'react';
import { Header } from '@askjamie/ui-kit';
import type { ReviewState } from '../../api/src/review';
import { readQueue,submitDecision } from './client';
export function ReviewDesk() {
  const [state,setState]=useState<ReviewState|null>(null),[selected,setSelected]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [reviewer,setReviewer]=useState(''),[rationale,setRationale]=useState(''),[overlap,setOverlap]=useState('');
  async function load(){try{const value=await readQueue();setState(value);setSelected(value.queue[0]?.submission.id??'');setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load the queue.');}}
  useEffect(()=>{void load();},[]);
  const item=state?.queue.find(v=>v.submission.id===selected);
  async function decide(decision:'approved'|'rejected') {
    if(!item || busy)return;
    if(reviewer.trim().length<2 || rationale.trim().length<30){setError('Enter your name and a review rationale of at least 30 characters.');return;}
    setBusy(true);setError('');setMessage('');
    try {
      await submitDecision({id:item.submission.id,digest:item.digest,decision,reviewer,rationale,...(overlap.trim()?{overlapRationale:overlap}:{})});
      setMessage(decision==='approved'?'Approval saved. Submit the updated review record through a pull request to publish.':'Rejection saved with your explanation.');
      setRationale('');setOverlap('');await load();
    } catch(e){setError(e instanceof Error?e.message:'The decision could not be saved.');}
    finally{setBusy(false);}
  }
  return <><Header surface="Review desk"><span className="muted small">Local workspace</span></Header><main className="review-main">
    <h1>Ready for judgment review</h1><p className="muted">Only submissions with current automated checks appear here.</p>
    {error?<p role="alert" className="status error">{error}</p>:null}
    {message?<p role="status" className="status">{message}</p>:null}
    {!state?<p role="status">Loading review queue…</p>:<div className="review-layout">
      <nav className="queue" aria-label="Review queue">{state.queue.length?state.queue.map(v=><button key={v.submission.id} aria-pressed={selected===v.submission.id} onClick={()=>{setSelected(v.submission.id);setRationale('');setOverlap('');setError('');}}>{v.submission.displayName}<span aria-hidden="true">›</span></button>):<p className="muted">No submissions are awaiting judgment review.</p>}<button className="quiet small" onClick={()=>void load()}>Refresh queue</button></nav>
      <section className="review-detail">{item?<><h2>{item.submission.displayName}</h2><p className="trust-label">Automated checks passed</p><p>{item.submission.plainDescription}</p>
        <section className="rubric"><h3>Scope and usefulness</h3><p className="muted small">Clear purpose · Specific trigger · Useful result · Appropriate data handling</p><p className="small">Triggers: {item.submission.triggerHints.join('; ')}. Attribution: {item.submission.contributedBy??'Not provided'}.</p>{item.evidence.findings.length?<p>Scanner notes: {item.evidence.findings.map(v=>v.title).join('; ')}</p>:null}</section>
        <details><summary>Read skill instructions</summary><pre>{item.content}</pre></details>
        <label htmlFor="reviewer">Reviewer name</label><input id="reviewer" value={reviewer} maxLength={100} onChange={e=>setReviewer(e.target.value)} placeholder="Enter your name"/>
        <label htmlFor="rationale">Review rationale</label><textarea id="rationale" value={rationale} maxLength={4000} onChange={e=>setRationale(e.target.value)} placeholder="Explain the scope, usefulness, limitations, and recommendation."/>
        {item.overlaps.length?<><p className="status">Potential overlap: {item.overlaps.map(v=>v.id).join(', ')}</p><label htmlFor="overlap">Why should this remain a separate skill?</label><textarea id="overlap" value={overlap} onChange={e=>setOverlap(e.target.value)} maxLength={2000}/></>:null}
        <div className="actions"><button className="primary" disabled={busy} onClick={()=>void decide('approved')}>Approve skill</button><button disabled={busy} onClick={()=>void decide('rejected')}>Not accepted</button><span className="muted small">Decisions are tied to the contents you reviewed.</span></div>
      </>:<><h2>The review queue is clear.</h2><p>New or changed packages appear here after passing the automated gates. Published decisions remain available below.</p></>}
      <section className="decisions"><h2>Recent decisions</h2>{state.decisions.length?<ul>{state.decisions.slice(-10).reverse().map((v,i)=><li key={v.id+v.reviewedAt+i}><strong>{v.id}</strong> · {v.decision}<p className="small muted">{v.reviewer} · {v.reviewerKind==='human'?'Human review':'Agent-assisted review'} · {new Date(v.reviewedAt).toLocaleDateString()}</p><p className="small">{v.rationale}</p></li>)}</ul>:<p className="empty">No decisions in this session.</p>}</section>
      {state.blocked.length?<section><h2>Automated checks need attention</h2><ul>{state.blocked.map(v=><li key={v.id}>{v.id}: {v.reason}</li>)}</ul><p className="small muted">These submissions cannot be approved from this queue.</p></section>:null}
      </section></div>}
    </main></>;
}
