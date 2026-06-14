import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.alertSent = false;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    if (!this.alertSent) {
      this.alertSent = true;
      fetch('/api/alert-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'react_error',
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          error: error?.stack || error?.message || String(error),
          componentStack: errorInfo?.componentStack,
        }),
      }).catch(() => {})
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-charcoal/90 backdrop-blur-md z-50 p-4 text-center">
          <div className="bg-cream-dark/80 backdrop-blur-sm p-8 rounded-xl border border-gold/20 max-w-2xl w-full">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gold-dark" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-heading text-gold-dark mb-2">Something went wrong</h2>
                <p className="text-charcoal-light/70">
                  We've encountered an issue, but our team has been notified. Please try refreshing the page or come back later.
                </p>
                {process.env.NODE_ENV !== 'production' && (
                  <div className="mt-4 p-4 bg-sage-light/10 rounded-sm text-xs">
                    <strong className="text-gold-dark">Error details:</strong>
                    <pre className="mt-2 overflow-auto text-left">{this.state.error?.toString()}</pre>
                  </div>
                )}
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-6 inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase px-6 py-3 rounded-sm transition-colors font-medium"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };