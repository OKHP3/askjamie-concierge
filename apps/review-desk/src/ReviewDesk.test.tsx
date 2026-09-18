// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, it, expect, vi } from 'vitest';
import { render,screen,cleanup,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewDesk } from './ReviewDesk';
import { readQueue,submitDecision } from './client';
vi.mock('./client',()=>({readQueue:vi.fn(),submitDecision:vi.fn()}));
const item={submission:{id:'meeting-notes',displayName:'Meeting Notes to Next Steps',plainDescription:'Summarizes notes into decisions and clear next steps.',triggerHints:['summarize meeting notes'],contributedBy:'Test contributor'},digest:'a'.repeat(64),content:'# Meeting notes\nReviewed instructions.',evidence:{findings:[]},overlaps:[],mechanicalPassed:true};
beforeEach(()=>{vi.mocked(readQueue).mockResolvedValue({queue:[item],decisions:[],blocked:[]} as never);vi.mocked(submitDecision).mockResolvedValue({});});
afterEach(()=>{cleanup();vi.resetAllMocks();});
it.each([['Approve skill','approved'],['Not accepted','rejected']])('submits %s only after a reasoned judgment',async(label,decision)=>{
  const user=userEvent.setup();render(<ReviewDesk/>);
  await screen.findByRole('heading',{name:'Meeting Notes to Next Steps'});
  await user.click(screen.getByText('Read skill instructions'));
  expect(screen.getByText(/Reviewed instructions/)).toBeTruthy();
  await user.type(screen.getByLabelText('Reviewer name'),'Test reviewer');
  await user.type(screen.getByLabelText('Review rationale'),'A clear bounded task with useful output and suitable handling of source material.');
  vi.mocked(readQueue).mockResolvedValueOnce({queue:[],decisions:[],blocked:[]});
  await user.click(screen.getByRole('button',{name:label}));
  await waitFor(()=>expect(submitDecision).toHaveBeenCalledWith(expect.objectContaining({id:'meeting-notes',digest:'a'.repeat(64),decision})));
  expect(await screen.findByRole('heading',{name:'The review queue is clear.'})).toBeTruthy();
});
it('keeps failed checks outside the approval view',async()=>{
  vi.mocked(readQueue).mockResolvedValue({queue:[],decisions:[],blocked:[{id:'blocked-skill',reason:'Security checks failed.'}]});
  render(<ReviewDesk/>);await screen.findByText(/blocked-skill/);
  expect(screen.queryByRole('button',{name:'Approve skill'})).toBeNull();
});
it('shows server errors and never claims a failed save succeeded',async()=>{
  const user=userEvent.setup();vi.mocked(submitDecision).mockRejectedValue(new Error('The package changed. Reload before reviewing.'));
  render(<ReviewDesk/>);await screen.findByLabelText('Reviewer name');
  await user.type(screen.getByLabelText('Reviewer name'),'Test reviewer');
  await user.type(screen.getByLabelText('Review rationale'),'This is a sufficiently detailed rationale for the reviewed contents.');
  await user.click(screen.getByRole('button',{name:'Approve skill'}));
  expect((await screen.findByRole('alert')).textContent).toContain('package changed');
  expect(screen.queryByText(/Approval saved/)).toBeNull();
});
