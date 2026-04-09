import React from 'react';
import { PolarisVizProvider } from '@shopify/polaris-viz';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './bootstrap';
import '@shopify/polaris-viz/build/cjs/styles.css';
import '../css/app.css';
import App from './components/App.jsx';

const appElement = document.getElementById('app');
const queryClient = new QueryClient();
const polarisVizThemes = {
    overviewCompact: {
        chartContainer: {
            minHeight: 220,
            sparkChartMinHeight: 140,
        },
    },
};

if (appElement) {
    const root = createRoot(appElement);

    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <PolarisVizProvider themes={polarisVizThemes}>
                    <BrowserRouter>
                        <App />
                    </BrowserRouter>
                </PolarisVizProvider>
            </QueryClientProvider>
        </React.StrictMode>,
    );
}
