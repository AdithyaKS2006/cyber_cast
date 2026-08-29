import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error && this.state.error.name === 'ChunkLoadError';
      
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 rounded-xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">
              {isChunkError ? "Network Connection Lost" : "System Malfunction Detected"}
            </h1>
            
            <p className="text-zinc-400 text-sm mb-8">
              {isChunkError 
                ? "The application failed to load a required module due to network instability. Please check your connection and refresh the interface."
                : "A critical runtime error has occurred in the UI. The issue has been logged securely."}
            </p>
            
            <button 
              onClick={this.handleReload}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-orange-950/40"
            >
              <RefreshCw className="w-4 h-4" /> Initialize Recovery
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
