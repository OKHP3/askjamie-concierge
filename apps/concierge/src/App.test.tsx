// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import seeds from '../../../seed-catalog/catalog.json';
import { App } from './App';
afterEach(()=>{cleanup();vi.unstubAllGlobals();localStorage.clear();});
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json(seeds.map(v=>({...v,trustStatus:'verified',trustLastCheckedAt:new Date().toISOString()})))));});
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
  expect(screen.getByRole('link',{name:'Download skill'}).getAttribute('href')).toContain('skills/meeting-notes/SKILL.md');
  await user.click(screen.getByRole('button',{name:'I’ve tried it'}));
  await user.click(screen.getByRole('button',{name:'Yes, it helped'}));
  expect(localStorage.getItem('askjamie.feedback.v1')).toContain('"outcome":"helped"');
  await user.click(screen.getByRole('button',{name:'Clear saved feedback'}));
  expect(localStorage.getItem('askjamie.feedback.v1')).toBeNull();
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
