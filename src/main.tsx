import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('BodaCare Uganda Application Error caught by RootErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      window.location.reload();
    } catch {
      window.location.href = '/';
    }
  };

  private handleResetCacheAndReload = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(window.localStorage).forEach((key) => {
          if (key.startsWith('bodacare_')) {
            window.localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // Ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B192C] text-white flex flex-col items-center justify-center p-4 selection:bg-amber-400 selection:text-slate-900">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto text-amber-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">BodaCare Uganda</h1>
              <p className="text-xs text-amber-400 font-semibold mt-1">Application Recovery</p>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              We encountered a temporary display issue while loading your dashboard. You can reload or reset your local device cache below.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-lg shadow-amber-400/20"
              >
                Reload BodaCare App
              </button>
              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
              >
                Clear Local Cache & Restart
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 text-left space-y-1">
              <p className="font-semibold text-slate-300">Direct Support & Administrator:</p>
              <p className="text-slate-300">Mukisa Brian (Founder & Director): <span className="font-mono text-amber-300">+256 772 100 240</span></p>
              <p>MTN Mobile Money: <span className="font-mono text-slate-200">0766848865</span></p>
              <p>Airtel Money: <span className="font-mono text-slate-200">0731931455</span></p>
              <p className="text-[11px] text-slate-500 pt-1">Location: Kikyusa, Luweero District, Uganda</p>
            </div>

            {this.state.error && (
              <details className="text-left text-[11px] bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-slate-400 overflow-x-auto">
                <summary className="cursor-pointer font-mono text-amber-400/90 hover:text-amber-300">
                  Diagnostic Information
                </summary>
                <p className="mt-2 text-rose-400 font-mono text-[10px] break-all">{this.state.error.toString()}</p>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('Critical Error: Failed to find element with id "root"');
}

