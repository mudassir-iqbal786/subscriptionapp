import { TitleBar } from '@shopify/app-bridge-react';
import ContractsPage from './subscriptions/pages/ContractsPage.jsx';
import ContractDetailPage from './subscriptions/pages/ContractDetailPage.jsx';
import CreatePlanPage from './subscriptions/pages/CreatePlanPage.jsx';
import OverviewPage from './subscriptions/pages/OverviewPage.jsx';
import PlanDescriptionPage from './subscriptions/pages/PlanDescriptionPage.jsx';
import PlansPage from './subscriptions/pages/PlansPage.jsx';
import SettingsPage from './subscriptions/pages/SettingsPage.jsx';
import { appUrl, getCurrentPage, pageContent } from './subscriptions/navigation.js';

const pages = {
    home: OverviewPage,
    plans: PlansPage,
    planDescription: PlanDescriptionPage,
    createPlan: CreatePlanPage,
    contracts: ContractsPage,
    contractDetail: ContractDetailPage,
    settings: SettingsPage,
};

export default function App() {
    const currentPage = getCurrentPage(window.location.pathname);
    const currentPageContent = pageContent[currentPage];
    const CurrentPageComponent = pages[currentPage] ?? OverviewPage;

    return (
        <>
            <s-app-nav>
                <s-link href={appUrl('/plans')}>Plans</s-link>
                <s-link href={appUrl('/contracts')}>Contracts</s-link>
                <s-link href={appUrl('/settings')}>Settings</s-link>
            </s-app-nav>

            <TitleBar title={currentPageContent.title}>
                {currentPageContent.parentHref ? <a href={appUrl(currentPageContent.parentHref)}>{currentPageContent.parentTitle}</a> : null}
                {!currentPageContent.parentHref && currentPage !== 'home' ? (
                    <a href={appUrl('/')} variant="breadcrumb">
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
