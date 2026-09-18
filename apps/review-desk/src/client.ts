import type { ReviewState } from '../../api/src/review';
export async function readQueue():Promise<ReviewState> {
  const response=await fetch('./api/reviews',{cache:'no-store'});
  if(!response.ok)throw new Error('The review queue is unavailable. Run the catalog scan, then reload.');
  return response.json();
}
export async function submitDecision(input:unknown) {
  const response=await fetch('./api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  const value=await response.json();
  if(!response.ok)throw new Error(value.error||'The decision could not be saved.');
  return value;
}
