import { TitleBar } from '@shopify/app-bridge-react';
import ContractsPage from './subscriptions/pages/ContractsPage.jsx';
import OverviewPage from './subscriptions/pages/OverviewPage.jsx';
import PlansPage from './subscriptions/pages/PlansPage.jsx';
import SettingsPage from './subscriptions/pages/SettingsPage.jsx';
import { getCurrentPage, pageContent } from './subscriptions/navigation.js';

const pages = {
    home: OverviewPage,
    plans: PlansPage,
    contracts: ContractsPage,
    settings: SettingsPage,
};

export default function App() {
    const currentPage = getCurrentPage(window.location.pathname);
    const currentPageContent = pageContent[currentPage];
    const CurrentPageComponent = pages[currentPage] ?? OverviewPage;

    return (
        <>
            <s-app-nav>
                <s-link href="/plans">Plans</s-link>
                <s-link href="/contracts">Contracts</s-link>
                <s-link href="/settings">Settings</s-link>
            </s-app-nav>

            <TitleBar title={currentPageContent.title}>
                {currentPage !== 'home' ? (
                    <a href="/" variant="breadcrumb">
                        Subscriptions
                    </a>
                ) : null}
            </TitleBar>

            <main className="app-shell">
                <CurrentPageComponent />
            </main>
        </>
    );
}
