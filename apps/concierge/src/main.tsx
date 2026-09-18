import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@askjamie/ui-kit/styles.css';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
