import React, { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import AppLayout from './components/navigation/AppLayout';
import LandingPage from './components/pages/LandingPage';
import LoginModal from './components/auth/LoginModal';
import RegisterModal from './components/auth/RegisterModal';
import { LoadingScreen } from './components/ui/Common';
import { ROLES, INITIAL_NOTIFICATIONS } from './constants';
import CookieConsent from './components/ui/CookieConsent';
import NotificationCenter from './components/ui/NotificationCenter';
import { wsManager } from './utils/websocketManager';
import apiClient from './utils/apiClient';
import ErrorBoundary from './components/ui/ErrorBoundary';

const App = () => {
  // --- Auth & Session ---
  const [user, setUser] = useState(null); // Never persisted to localStorage — re-hydrated from API on load
  const [activePage, setActivePage] = useState(() => JSON.parse(localStorage.getItem('cyber_page')) || 'landing');
  const [isLoginOpen, setLoginOpen] = useState(false);
  const [isRegisterOpen, setRegisterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- UI State ---
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isSidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [isTriageOpen, setTriageOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // --- NLQ State (Query & Results moved to NLQOverlay) ---
  const [isNLQOpen, setNLQOpen] = useState(false);
  const [isNotificationCenterOpen, setNotificationCenterOpen] = useState(false);

  // Redirect to app if user session is re-hydrated
  useEffect(() => {
    if (user && (activePage === 'landing' || activePage === 'login' || activePage === 'register')) {
      setActivePage('predictions/heatmap');
    }
  }, [user, activePage]);

  useEffect(() => {
    localStorage.setItem('cyber_page', JSON.stringify(activePage));
  }, [activePage]);

  // Initialize websockets on mount if user is already logged in
  useEffect(() => {
    if (user && activePage !== 'landing') {
      wsManager.initialize();
    }
  }, [user]);

  // Sync theme
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Keyboard shortcuts (Cmd+K for NLQ)
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setNLQOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Re-hydrate session from backend API on page load (not from localStorage)
  // This ensures the role/permissions are always authoritative from the server.
  useEffect(() => {
    const verifySession = async () => {
      // Avoid making endpoint call if no auth cookies exist to prevent unauthenticated 401 console noise
      const hasAuthCookie = document.cookie.includes('access_token') || document.cookie.includes('sessionid');
      if (!hasAuthCookie) {
        setUser(null);
        setActivePage('landing');
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiClient('/api/v1/users/me/', { method: 'GET' });
        if (res.ok) {
          const userData = await res.json();
          setUser({
            ...userData,
            name: userData.full_name ||
                  `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
                  userData.username || 'Operator',
            role: userData.role
              ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1).toLowerCase()
              : userData.role,
          });
        } else {
          setUser(null);
          setActivePage('landing');
        }
      } catch {
        setUser(null);
        setActivePage('landing');
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, []);

  // Handlers
  const handleLogin = useCallback((userData) => {
    const normalizedUser = {
      ...userData,
      name: userData.full_name ||
            `${userData.first_name || ''} ${userData.last_name || ''}`.trim() ||
            userData.username ||
            'Operator',
      role: userData.role
        ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1).toLowerCase()
        : userData.role,
    };
    setUser(normalizedUser);
    setLoginOpen(false);
    setRegisterOpen(false);
    const defaultPage = 'predictions/heatmap';
    setActivePage(defaultPage);
    wsManager.initialize();
    toast.success(`Access granted: ${normalizedUser.role}`);
  }, []);

  const handleLogout = useCallback(() => {
    wsManager.disconnectAll();
    setUser(null);
    setActivePage('landing');
    toast("Protocol terminated", { icon: '🚫' });
  }, []);

  const navigate = useCallback((page) => {
    window.scrollTo(0, 0);
    if (!user && !['landing', 'login', 'register'].includes(page)) {
      setActivePage('landing');
      return;
    }
    setActivePage(page);
  }, [user]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const handleOpenNotifications = useCallback(() => {
    setNotificationCenterOpen(true);
    markAllAsRead();
  }, [markAllAsRead]);

  const handleUpdateUser = useCallback((updatedUser) => {
    const normalizedUser = {
      ...updatedUser,
      name: updatedUser.full_name ||
            `${updatedUser.first_name || ''} ${updatedUser.last_name || ''}`.trim() ||
            updatedUser.username ||
            'Operator',
      role: updatedUser.role
        ? updatedUser.role.charAt(0).toUpperCase() + updatedUser.role.slice(1).toLowerCase()
        : updatedUser.role,
    };
    setUser(normalizedUser);
    // Note: user is NOT written to localStorage — re-hydrated from API on next page load
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    if (user) {
      wsManager.initialize();
    }
    return () => {
      if (user) wsManager.disconnectAll();
    };
  }, []); // Run once on mount

  if (isLoading) return <LoadingScreen />;

  if (!user || activePage === 'landing') {
    return (
      <>
        <LandingPage 
          navigate={navigate}
          onLogin={handleLogin} 
        />
        <CookieConsent />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <>
      <ErrorBoundary>
        <AppLayout 
          user={user}
          activePage={activePage}
          navigate={navigate}
          isSidebarOpen={isSidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isTriageOpen={isTriageOpen}
          setTriageOpen={setTriageOpen}
          theme={theme}
          toggleTheme={toggleTheme}
          handleLogout={handleLogout}
          isNLQOpen={isNLQOpen}
          setNLQOpen={setNLQOpen}
          notifications={notifications}
          unreadCount={notifications.filter(n => !n.read).length}
          markAllAsRead={markAllAsRead}
          onOpenNotifications={handleOpenNotifications}
          onUpdateUser={handleUpdateUser}
        />
      </ErrorBoundary>
      <CookieConsent />
      <NotificationCenter 
        isOpen={isNotificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        notifications={notifications}
        setNotifications={setNotifications}
        navigate={navigate}
      />
    </>
  );
};

export default App;
