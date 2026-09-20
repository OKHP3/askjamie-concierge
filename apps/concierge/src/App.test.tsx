// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import seeds from '../../../seed-catalog/catalog.json';
import { App } from './App';
import { ApplicationGuide } from './ApplicationGuide';
import { catalogEntrySchema } from '@askjamie/catalog-schema';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();localStorage.clear();});
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json(seeds.map(v=>({...v,packageSha256:'a'.repeat(64),trustStatus:'verified',trustLastCheckedAt:new Date().toISOString()})))));});
it('guides a goal through platform choice, match, installation and recorded feedback',async()=>{
  const user=userEvent.setup();render(<App/>);
  await screen.findByRole('button',{name:'Find a skill'});
  await user.click(screen.getByRole('button',{name:'Summarize meeting notes'}));
  await user.click(screen.getByRole('button',{name:'Find a skill'}));
  expect(screen.getByRole('status').textContent).toContain('Which agent');
  await user.selectOptions(screen.getByRole('combobox'),'copilot');
  await user.click(screen.getByRole('button',{name:'Find a skill'}));
  expect(screen.getByRole('heading',{name:'I found a good fit.'})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Show me how to use it'}));
  expect(screen.getByText(/.github\/skills\/meeting-notes\/SKILL.md/,{selector:'pre'})).toBeTruthy();
  expect(screen.getByRole('link',{name:'Download skill'}).getAttribute('href')).toContain('skills/meeting-notes/'+'a'.repeat(64)+'/SKILL.md');
  expect(document.activeElement).toBe(screen.getByRole('heading',{name:seeds[0].displayName}));
  await user.click(screen.getByRole('button',{name:'I’ve tried it'}));
  await user.click(screen.getByRole('button',{name:'Yes, it helped'}));
  expect(localStorage.getItem('askjamie.feedback.v1')).toContain('"outcome":"helped"');
  await user.click(screen.getByRole('button',{name:'Clear saved feedback'}));
  expect(localStorage.getItem('askjamie.feedback.v1')).toBeNull();
  await user.click(screen.getByRole('button',{name:'Back to matches'}));
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'Show me how to use it'}));
});
it('offers a later contribution path without a contribution interview',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByRole('button',{name:'Find a skill'});
  await user.type(screen.getByRole('textbox',{name:'Your goal'}),'Plan a hiking trip');
  await user.selectOptions(screen.getByRole('combobox'),'claude');
  await user.click(screen.getByRole('button',{name:'Find a skill'}));
  expect(screen.getByRole('heading',{name:'I could not find a good fit yet.'})).toBeTruthy();
  expect(screen.getByText(/Guided contributions are planned/)).toBeTruthy();
});
it('shows a catalog outage explicitly',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:503})));render(<App/>);
  expect((await screen.findByRole('alert')).textContent).toContain('unavailable');
});
it.each(['Download skill','Copy setup request','Copy first-task prompt'])('blocks %s if the review expires while the guide is open',control=>{
  vi.useFakeTimers();
  const checkedAt=new Date().toISOString();
  const clipboard={writeText:vi.fn()};
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:clipboard});
  const entry=catalogEntrySchema.parse({...seeds[0],packageSha256:'a'.repeat(64),trustStatus:'verified',trustLastCheckedAt:checkedAt});
  render(<ApplicationGuide entry={entry} platform="claude" onBack={()=>{}}/>);
  vi.setSystemTime(Date.parse(checkedAt)+8*86400_000+1);
  const target=screen.getByRole(control==='Download skill'?'link':'button',{name:control});
  if(control==='Download skill')expect(fireEvent.click(target)).toBe(false);
  else fireEvent.click(target);
  expect(screen.getByRole('alert').textContent).toContain('fresh review');
  expect(clipboard.writeText).not.toHaveBeenCalled();
  expect(screen.queryByRole('link',{name:'Download skill'})).toBeNull();
});
