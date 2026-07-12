import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface State {
  error: Error | null;
}

/** Last line of defence: the app never white-screens; local data is safe. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-page p-6">
        <div className="card max-w-md px-6 py-8 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-muted">
            The app hit an unexpected error. Your library is safe on this device — reload
            to continue.
          </p>
          <pre className="mt-4 max-h-24 overflow-auto rounded-lg bg-sunken p-3 text-left text-xs text-muted">
            {this.state.error.message}
          </pre>
          <Button
            variant="primary"
            className="mt-5"
            onClick={() => window.location.reload()}
          >
            Reload app
          </Button>
        </div>
      </div>
    );
  }
}
