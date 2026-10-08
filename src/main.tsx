import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { LabProvider } from './state/LabContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LabProvider>
        <App />
      </LabProvider>
    </HashRouter>
  </StrictMode>,
);
