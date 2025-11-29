import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050214] flex items-center justify-center p-4 selection:bg-red-500/30">
          <div className="max-w-md w-full text-center bg-gray-900/80 border border-red-500/30 p-8 rounded-2xl backdrop-blur-md shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="text-6xl mb-4">💥</div>
            <h1 className="text-3xl font-black text-red-500 mb-2 uppercase tracking-tight">
              SYSTEM FAILURE
            </h1>
            <p className="text-red-400/70 font-mono text-sm mb-8 border-t border-b border-red-900/30 py-4">
              CRITICAL ERROR: {this.state.error?.message || "UNKNOWN EXCEPTION"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-red-600/20 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/50 rounded-lg font-bold uppercase tracking-widest transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            >
              REBOOT SYSTEM
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
