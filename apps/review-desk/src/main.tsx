import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReviewDesk } from './ReviewDesk';
import '@askjamie/ui-kit/styles.css';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><ReviewDesk/></React.StrictMode>);
