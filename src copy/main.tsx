import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { App } from '@/App';
import { Providers } from '@/contexts/Providers';
import '@/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Providers>
  </React.StrictMode>
);