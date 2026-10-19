import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '../design-kit/flowchemia.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
