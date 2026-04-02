import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import './bootstrap';
import '../css/app.css';
import App from './components/App.jsx';

const appElement = document.getElementById('app');
const queryClient = new QueryClient();

if (appElement) {
    const root = createRoot(appElement);

    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <App />
            </QueryClientProvider>
        </React.StrictMode>,
    );
}
