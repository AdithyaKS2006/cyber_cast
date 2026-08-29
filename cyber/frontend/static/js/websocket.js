class ReconnectingWebSocket {
    constructor(url, options = {}) {
        this.url = url;
        this.maxRetries = options.maxRetries || 10;
        this.retryDelay = options.retryDelay || 1000;
        this.maxRetryDelay = options.maxRetryDelay || 30000;
        this.onMessage = options.onMessage || (() => {});
        this.onConnect = options.onConnect || (() => {});
        this.onDisconnect = options.onDisconnect || (() => {});
        
        this.ws = null;
        this.retryCount = 0;
        this.intentionallyClosed = false;
        
        this.connect();
    }
    
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const fullUrl = `${protocol}//${window.location.host}${this.url}`;
        
        try {
            this.ws = new WebSocket(fullUrl);
        } catch (e) {
            this.scheduleReconnect();
            return;
        }
        
        this.ws.onopen = () => {
            this.retryCount = 0;
            this.retryDelay = 1000;
            this.onConnect();
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.onMessage(data);
            } catch (e) {
            }
        };
        
        this.ws.onclose = (event) => {
            if (!this.intentionallyClosed) {
                this.onDisconnect();
                this.scheduleReconnect();
            }
        };
        
        this.ws.onerror = (error) => {
        };
    }
    
    scheduleReconnect() {
        if (this.retryCount >= this.maxRetries) {
            return;
        }
        const delay = Math.min(this.retryDelay * Math.pow(2, this.retryCount), this.maxRetryDelay);
        this.retryCount++;
        setTimeout(() => this.connect(), delay);
    }
    
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
        } else {
        }
    }
    
    close() {
        this.intentionallyClosed = true;
        if (this.ws) this.ws.close();
    }
}

// Replace all WebSocket usage in app.js:
const WS = {
    dashboard: null,
    notifications: null,
    blockchain: null,
    
    init() {
        const token = this._getToken();
        if (!token) return;
        
        this.dashboard = new ReconnectingWebSocket(`/ws/dashboard/?token=${token}`, {
            onMessage: (data) => this._handleDashboard(data),
        });
        
        this.notifications = new ReconnectingWebSocket(`/ws/notifications/?token=${token}`, {
            onMessage: (data) => this._handleNotification(data),
        });
    },
    
    _getToken() {
        // Token is in httpOnly cookie, browser sends it automatically
        // For WebSocket, we need to pass it via query string
        // Read from a non-httpOnly cookie we set alongside the httpOnly one
        return document.cookie.split(';')
            .find(c => c.trim().startsWith('ws_token='))
            ?.split('=')[1];
    },
    
    _handleDashboard(data) {
        if (data.type === 'dashboard_init' && typeof DashboardPage !== 'undefined') {
            DashboardPage.updateStats?.(data.data);
        }
        if (data.type === 'threat_timeline_update' && currentPage === 'dashboard') {
            DashboardPage.updateChart?.(data.data);
        }
    },
    
    _handleNotification(data) {
        if (data.type === 'notification' && typeof notifications !== 'undefined') {
            notifications.unshift({ ...data.data, read: false });
            renderNotifications();
            updateNotifBadge();
            if (typeof Components !== 'undefined' && Components.showToast) {
                Components.showToast(data.data.title, 'warning');
            }
        }
        if (data.type === 'unread_count') {
            updateNotifBadge(data.count);
        }
    },
    
    destroy() {
        if (this.dashboard) this.dashboard.close();
        if (this.notifications) this.notifications.close();
        if (this.blockchain) this.blockchain.close();
        this.dashboard = null;
        this.notifications = null;
        this.blockchain = null;
    },
};
