import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            <div className="flex items-center gap-3 text-rose-600 mb-6">
              <AlertCircle className="w-8 h-8" />
              <h1 className="text-2xl font-bold">დაფიქსირდა შეცდომა</h1>
            </div>
            <div className="bg-slate-100 dark:bg-slate-700 rounded-xl p-4 overflow-auto text-left">
              <pre className="text-rose-600 text-sm font-mono whitespace-pre-wrap">
                {this.state.error?.toString()}
              </pre>
              <br />
              <pre className="text-slate-500 dark:text-slate-400 text-xs font-mono whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
            >
              გვერდის განახლება
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
