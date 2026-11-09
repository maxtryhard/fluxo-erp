import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './reference-layout.css';
import './theme.css';
import './navigation-dock.css';
import './system-guide.css';
import './guided-tour.css';
import './entry-page.css';
import './landing-motion.css';
import './access-page.css';
import './messaging.css';
import { applyTheme, preferredTheme } from './theme';

applyTheme(preferredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
