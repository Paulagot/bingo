// src/main.tsx
// AppKit is no longer imported here at all.
// initAppKit() is called on demand from Web3Provider
// and from PaymentMethodSelector when crypto is selected.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import './styles/global.css';
import './pages/site/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
