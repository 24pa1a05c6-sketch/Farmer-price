import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[KisanSetu ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F4EC] text-[#10271F] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white rounded-3xl p-8 border border-[#B68A57]/30 shadow-lg text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-2xl">
              !
            </div>
            <h1 className="text-2xl font-bold text-[#163B2B]">
              Application Encountered an Issue
            </h1>
            <p className="text-sm text-[#72796F]">
              KisanSetu recovered from an unexpected rendering error. Your local settings and offline data are preserved.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-red-50 text-red-800 text-xs text-left rounded-xl overflow-x-auto font-mono">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-[#163B2B] text-[#F7F4EC] font-semibold text-sm hover:opacity-95"
              >
                Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
