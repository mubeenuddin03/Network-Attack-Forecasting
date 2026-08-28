import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: unknown[];
  renderError?: (error: Error, reset: () => void) => ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some((key, i) => key !== prevProps.resetKeys?.[i]);
      if (hasResetKeyChanged) this.reset();
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.renderError) {
        return this.props.renderError(this.state.error!, this.reset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <DefaultErrorFallback error={this.state.error!} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: DefaultErrorFallbackProps) {
  return (
    <div className="glass-panel rounded-2xl p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-critical-500/15 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-critical-400" />
      </div>
      <h2 className="text-heading-md text-text-primary mb-2">Something went wrong</h2>
      <p className="text-body-sm text-text-muted mb-6">
        An unexpected error occurred. Our team has been notified.
      </p>
      <details className="text-left mb-4 p-3 bg-surface-800 rounded-lg text-caption text-text-muted">
        <summary className="cursor-pointer font-medium text-text-secondary">Error details</summary>
        <pre className="mt-2 overflow-auto max-h-32">{error.message}</pre>
      </details>
      <div className="flex gap-3 justify-center">
        <Button onClick={onReset} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Try Again
        </Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
    </div>
  );
}

export class ErrorFallback extends Component<{ error: Error; resetErrorBoundary: () => void }> {
  render() {
    return (
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-3 text-critical-400 mb-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Component Error</span>
        </div>
        <p className="text-body-sm text-text-muted mb-4">
          This component failed to render. Please try refreshing or contact support.
        </p>
        <Button onClick={this.props.resetErrorBoundary} size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
          Retry
        </Button>
      </div>
    );
  }
}