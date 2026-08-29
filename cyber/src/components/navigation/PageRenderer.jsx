import React, { Suspense, lazy } from 'react';
import ErrorBoundary from '../ui/ErrorBoundary';
import { LoadingScreen } from '../ui/Common';

// Lazy load pages for better performance
import LandingPage from '../pages/LandingPage';

// Core CrimeCast pages
// Core CrimeCast pages
const CrimeCastDashboard = lazy(() => import('../pages/Dashboard'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const CyberGuru = lazy(() => import('../ai/CyberGuru'));
const ModelMetrics = lazy(() => import('../pages/ModelMetrics'));
const AnalyticsPage = lazy(() => import('../analytics/AnalyticsPage'));
const GatewayMonitor = lazy(() => import('../pages/GatewayMonitor'));
const FieldDispatchMobile = lazy(() => import('../pages/FieldDispatchMobile'));

// CrimeCast Prediction Pipeline
const ComplaintsDashboard = lazy(() => import('../complaints/ComplaintsDashboard'));
const ComplaintForm = lazy(() => import('../complaints/ComplaintForm'));
const ComplaintDetail = lazy(() => import('../complaints/ComplaintDetail'));
const PredictionMap    = lazy(() => import('../predictions/PredictionMap'));
const PredictionDetail = lazy(() => import('../predictions/PredictionDetail'));
const AlertCenter = lazy(() => import('../alerts/AlertCenter'));
const LEADispatchQueue = lazy(() => import('../alerts/LEADispatchQueue'));

// Access Denied / 404 Pages
const AccessDeniedPage = lazy(() => import('../pages/AccessDeniedPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const PAGE_ROLES = {
  'dashboard': ['analyst','validator','administrator','operator','consumer','officer','supervisor'],
  'guru': ['analyst','validator','administrator','operator','consumer','officer','supervisor'],
  'analytics': ['analyst','validator','administrator','officer','supervisor'],
  'profile': ['analyst','validator','administrator','operator','consumer','officer','supervisor'],
  'complaints': ['analyst','validator','administrator','operator','officer','supervisor'],
  'complaints/new': ['analyst','validator','administrator','operator','officer','supervisor'],
  'predictions': ['analyst','validator','administrator','operator','officer','supervisor'],
  'predictions/heatmap': ['analyst','validator','administrator','operator','officer','supervisor'],
  'alerts': ['analyst','validator','administrator','operator','officer','supervisor'],
  'lea-dispatches': ['analyst','validator','administrator','operator','officer','supervisor'],
  'model-metrics': ['analyst','validator','administrator','officer','supervisor'],
  'gateway-monitor': ['analyst','validator','administrator','operator','officer','supervisor'],
  'field-mobile': ['analyst','validator','administrator','operator','officer','supervisor'],
  'ai-advisor': ['analyst','validator','administrator','operator','officer','supervisor'],
  'settings': ['analyst','validator','administrator','operator','officer','supervisor'],
};

const PageRenderer = ({ activePage, currentPage, navigate, user, onUpdateUser }) => {
  const targetPage = activePage || currentPage;

  const renderPage = () => {
    // Strict Role Requirements Guard Check
    const allowedRoles = PAGE_ROLES[targetPage];
    if (allowedRoles && user?.role && !allowedRoles.includes(user.role.toLowerCase())) {
      return <AccessDeniedPage navigate={navigate} />;
    }

    switch (targetPage) {
      case 'landing': return <LandingPage onEnter={() => navigate('predictions/heatmap')} onLogin={onUpdateUser} navigate={navigate} />;
      case 'dashboard': return <CrimeCastDashboard navigate={navigate} />;
      case 'predictions': return <PredictionMap navigate={navigate} initialMode="predictions" />;
      case 'predictions/heatmap': return <PredictionMap navigate={navigate} initialMode="heatmap" />;
      case 'analytics': return <AnalyticsPage navigate={navigate} />;
      case 'model-metrics': return <ModelMetrics navigate={navigate} />;
      case 'gateway-monitor': return <GatewayMonitor navigate={navigate} />;
      case 'field-mobile': return <FieldDispatchMobile navigate={navigate} />;
      case 'guru':
      case 'ai-advisor': return <CyberGuru />;
      case 'profile':
      case 'settings': return <ProfilePage user={user} onUpdateUser={onUpdateUser} navigate={navigate} />;
      case 'complaints': return <ComplaintsDashboard navigate={navigate} />;
      case 'complaints/new': return <ComplaintForm navigate={navigate} />;
      case 'alerts': return <AlertCenter navigate={navigate} />;
      case 'lea-dispatches': return <LEADispatchQueue />;

      default: {
        // Dynamic routes
        if (targetPage.startsWith('complaints/')) {
          const id = targetPage.split('/')[1];
          return <ComplaintDetail complaintId={id} navigate={navigate} />;
        }
        if (targetPage.startsWith('predictions/') && targetPage !== 'predictions/heatmap') {
          const id = targetPage.split('/')[1];
          return <PredictionDetail predictionId={id} navigate={navigate} />;
        }
        return <NotFoundPage navigate={navigate} />;
      }
    }
  };

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        {renderPage()}
      </Suspense>
    </ErrorBoundary>
  );
};

export default React.memo(PageRenderer);
