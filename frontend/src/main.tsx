import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './reference-layout.css';
import './theme.css';
import { applyTheme, preferredTheme } from './theme';

applyTheme(preferredTheme());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
