import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to listen for WebSocket events dispatched as CustomEvents.
 *
 * Usage:
 *   useWebSocket('ws:dashboard', (data) => {
 *     if (data.type === 'threat_timeline_update') {
 *       setChartData(data.data);
 *     }
 *   });
 */
export function useWebSocket(eventName, handler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (e) => {
      handlerRef.current(e.detail);
    };
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }, [eventName]);
}

/**
 * Hook for notification WebSocket events
 */
export function useNotificationWebSocket(onNewNotification, onUnreadCount) {
  useWebSocket('ws:notification', useCallback((data) => {
    if (data.type === 'notification' && onNewNotification) {
      onNewNotification(data.data);
    }
    if (data.type === 'unread_count' && onUnreadCount) {
      onUnreadCount(data.count);
    }
  }, [onNewNotification, onUnreadCount]));
}

/**
 * Hook for dashboard real-time updates
 */
export function useDashboardWebSocket(onTimelineUpdate, onStatsUpdate) {
  useWebSocket('ws:dashboard', useCallback((data) => {
    if (data.type === 'threat_timeline_update' && onTimelineUpdate) {
      onTimelineUpdate(data.data);
    }
    if (data.type === 'dashboard_init' && onStatsUpdate) {
      onStatsUpdate(data.data);
    }
  }, [onTimelineUpdate, onStatsUpdate]));
}

/**
 * Hook for real-time threat feed updates
 */
export function useThreatWebSocket(onNewThreat, onUpdateThreat) {
  useWebSocket('ws:threat', useCallback((data) => {
    if (data.type === 'new_threat' && onNewThreat) {
      onNewThreat(data.data);
    }
    if (data.type === 'update_threat' && onUpdateThreat) {
      onUpdateThreat(data.data);
    }
  }, [onNewThreat, onUpdateThreat]));
}

/**
 * Hook for real-time enterprise defense updates (Zero-Day, Wiper, etc)
 */
export function useEnterpriseDefenseWebSocket(onDefenseEvent) {
  useWebSocket('ws:enterpriseDefense', useCallback((data) => {
    if (onDefenseEvent) {
      onDefenseEvent(data);
    }
  }, [onDefenseEvent]));
}
