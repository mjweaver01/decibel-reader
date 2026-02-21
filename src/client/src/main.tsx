import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MonitoringStatusProvider } from './context/MonitoringStatusContext';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MonitoringStatusProvider>
        <App />
      </MonitoringStatusProvider>
    </BrowserRouter>
  </React.StrictMode>
);
