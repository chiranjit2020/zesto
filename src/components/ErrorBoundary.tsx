import { Component, type ErrorInfo, type ReactNode } from 'react';
import { track } from '../lib/track';
import { Button } from './ui/Button';
import { ZImage } from './ui/ZMark';

/**
 * The app's one error boundary (docs/ANALYTICS_FEEDBACK_PLAN.md §14 — "if the
 * application already has an error boundary, integrate carefully"; it didn't, so this
 * is the net-new minimal version the spec asks for, not a full error-monitoring
 * platform). Wraps the whole app in `main.tsx`, outside `BrowserRouter` — reads
 * `window.location.pathname` directly rather than through router context, since a
 * crash below `BrowserRouter` would otherwise take the boundary itself down with it.
 *
 * Logs exactly one `app_error` event per crash (a boundary only re-renders once
 * something actually threw, so this can never flood analytics the way a per-render or
 * per-request event would) — `error_type` and a truncated `message` only, never a full
 * stack trace or request/state payload, which could carry sensitive app data.
 */
interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    track('app_error', {
      error_type: error.name || 'Error',
      message: error.message?.slice(0, 200),
      page: window.location.pathname,
      component_stack_present: !!info.componentStack,
      version: __ZESTO_VERSION__,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[100dvh] grid place-items-center p-6 text-center" data-surface="midnight">
        <div className="max-w-sm">
          <div className="mx-auto w-fit">
            <ZImage size={56} />
          </div>
          <h1 className="text-xl font-bold mt-4">Something went wrong</h1>
          <p className="text-sm text-content-muted mt-2">
            Zesto hit a snag. Your pantry and saved recipes are safe — they live on this
            device and this doesn't touch them.
          </p>
          <Button size="lg" className="mt-5" onClick={() => window.location.reload()}>
            Reload Zesto
          </Button>
        </div>
      </div>
    );
  }
}
