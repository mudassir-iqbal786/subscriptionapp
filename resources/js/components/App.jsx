import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { TitleBar } from '@shopify/app-bridge-react';
import ContractsPage from './subscriptions/pages/ContractsPage.jsx';
import ContractDetailPage from './subscriptions/pages/ContractDetailPage.jsx';
import CreatePlanPage from './subscriptions/pages/CreatePlanPage.jsx';
import OverviewPage from './subscriptions/pages/OverviewPage.jsx';
import PlanDescriptionPage from './subscriptions/pages/PlanDescriptionPage.jsx';
import PlansPage from './subscriptions/pages/PlansPage.jsx';
import SettingsPage from './subscriptions/pages/SettingsPage.jsx';
import { AppAnchor, AppNavLink, buildAppPath, getCurrentPage, pageContent } from './subscriptions/navigation.jsx';

export default function App() {
    const location = useLocation();
    const currentPage = getCurrentPage(location.pathname);
    const currentPageContent = pageContent[currentPage];

    return (
        <>
            <s-app-nav>
                <AppNavLink to="/plans">Plans</AppNavLink>
                <AppNavLink to="/contracts">Contracts</AppNavLink>
                <AppNavLink to="/settings">Settings</AppNavLink>
            </s-app-nav>

            <TitleBar title={currentPageContent.title}>
                {currentPageContent.parentHref ? <AppAnchor to={currentPageContent.parentHref}>{currentPageContent.parentTitle}</AppAnchor> : null}
                {!currentPageContent.parentHref && currentPage !== 'home' ? (
                    <AppAnchor to="/" variant="breadcrumb">
                        Subscriptions
                    </AppAnchor>
                ) : null}
            </TitleBar>

            <main className="app-shell">
                <Routes>
                    <Route element={<OverviewPage />} path="/" />
                    <Route element={<PlansPage />} path="/plans" />
                    <Route element={<CreatePlanPage />} path="/plans/create" />
                    <Route element={<PlanDescriptionPage />} path="/plans/description/:planId" />
                    <Route element={<ContractsPage />} path="/contracts" />
                    <Route element={<ContractDetailPage />} path="/contracts/detail/:contractId" />
                    <Route element={<SettingsPage />} path="/settings" />
                    <Route element={<Navigate replace to={buildAppPath('/', location.search)} />} path="*" />
                </Routes>
            </main>
        </>
    );
}
