/**
 * WebSocket manager with automatic reconnection.
 * Handles connection, disconnection, message routing,
 * and exponential backoff reconnection.
 */

class WebSocketConnection {
  constructor(path, handlers = {}) {
    this.path = path;
    this.handlers = handlers;
    this.ws = null;
    this.retryCount = 0;
    this.maxRetries = 8;
    this.baseDelay = 1000;
    this.maxDelay = 30000;
    this.intentionalClose = false;
    this._pingInterval = null;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultHost = (window.location.port === '3000' || window.location.port === '5173')
      ? `${window.location.hostname}:8000`
      : window.location.host;
    const host = import.meta.env.VITE_WS_HOST || defaultHost;
    let url = `${protocol}//${host}${this.path}`;

    const match = document.cookie.match(new RegExp('(^| )ws_token=([^;]+)'));
    const token = match ? match[2] : null;
    if (token) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}token=${token}`;
    }

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.retryCount = 0;
      this.handlers.onConnect?.();
      this._startPing();
      this._dispatchStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return;
        this.handlers.onMessage?.(data);
      } catch {
        // Non-JSON message, ignore
      }
    };

    this.ws.onclose = (event) => {
      this._stopPing();
      if (!this.intentionalClose) {
        this.handlers.onDisconnect?.();
        this._dispatchStatus('disconnected');
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this._dispatchStatus('error');
    };
  }

  _dispatchStatus(status) {
    window.dispatchEvent(new CustomEvent('ws:status', { detail: { path: this.path, status } }));
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    this.intentionalClose = true;
    this._stopPing();
    // Catch edge cases where WS is closed before connection is established (React StrictMode double-mount)
    if (this.ws) {
      if (this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.onopen = () => this.ws.close();
      } else {
        this.ws.close();
      }
    }
  }

  _scheduleReconnect() {
    if (this.intentionalClose) return;
    if (this.retryCount >= this.maxRetries) {
      this._dispatchStatus('fallback_polling');
      this.intentionalClose = true; // prevent further auto-reconnects
      return;
    }
    const baseWait = Math.min(
      this.baseDelay * Math.pow(2, this.retryCount),
      this.maxDelay
    );
    // Add jitter (±20%) to prevent thundering herd
    const jitter = baseWait * 0.2 * (Math.random() * 2 - 1);
    const delay = baseWait + jitter;
    
    this.retryCount++;
    setTimeout(() => {
      if (!this.intentionalClose) this.connect();
    }, delay);
  }

  _startPing() {
    this._pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  _stopPing() {
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  }
}

class WebSocketManager {
  constructor() {
    this.connections = {};
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this.connections.dashboard = new WebSocketConnection('/ws/dashboard/', {
      onConnect: () => this._log('Dashboard WS connected'),
      onDisconnect: () => this._log('Dashboard WS disconnected'),
      onMessage: (data) => this._handleDashboard(data),
    });

    this.connections.notifications = new WebSocketConnection('/ws/notifications/', {
      onConnect: () => this._log('Notifications WS connected'),
      onMessage: (data) => this._handleNotification(data),
    });

    Object.values(this.connections).forEach((conn) => conn.connect());
  }

  // bluetooth method removed

  disconnectAll() {
    Object.values(this.connections).forEach((conn) => conn.close());
    this.connections = {};
    this._initialized = false;
  }
  
  reconnectAll() {
    Object.values(this.connections).forEach((conn) => {
      if (conn.retryCount < conn.maxRetries) {
        conn.intentionalClose = false;
        conn.retryCount = 0;
        conn.connect();
      }
    });
  }

  _handleDashboard(data) {
    const event = new CustomEvent('ws:dashboard', { detail: data });
    window.dispatchEvent(event);
  }

  _handleNotification(data) {
    const event = new CustomEvent('ws:notification', { detail: data });
    window.dispatchEvent(event);
  }

  // legacy handlers removed

  _log(msg) {
    if (import.meta.env.DEV) {
      console.info(`[WebSocket] ${msg}`);
    }
  }
}

export const wsManager = new WebSocketManager();

export function useWebSocketEvent(eventName, handler) {
  // Usage: useWebSocketEvent('ws:dashboard', (data) => {...})
  // Import { useEffect } from 'react';
  // useEffect(() => {
  //   const listener = (e) => handler(e.detail);
  //   window.addEventListener(eventName, listener);
  //   return () => window.removeEventListener(eventName, listener);
  // }, [eventName, handler]);
}
