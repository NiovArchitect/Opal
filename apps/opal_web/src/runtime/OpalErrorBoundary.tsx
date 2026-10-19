/**
 * Repair #19 W20 (JA-05, BS-07 leg 2) — the runtime crash boundary.
 *
 * The face is the CURRENT design: the C2 shell's own root and token
 * system (`.c2s-root` carries the mode's canvas/ink, so both modes
 * render correctly), never the legacy first-run face on a hardcoded
 * dark ground it used to render. Recovery reloads the current URL,
 * re-entering the C2 shell with the session preserved. The old
 * first-run-restart recovery navigated to a reset flag whose only
 * consumer was the unmounted legacy app, so that dead path is
 * deleted: the boundary carries no reference to it anymore (the
 * absence is scan-pinned by ja05ErrorBoundary.test.tsx).
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

export class OpalErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[opal-runtime-boundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="c2s-root" data-shell="c2" data-testid="runtime-error-boundary">
          <div className="c2s-boundary">
            <p className="c2s-boundary-title" role="alert">
              Something interrupted Opal.
            </p>
            <p className="c2s-lede">
              The product should never stay on a blank screen. Reloading picks up
              right where you left off — you stay signed in.
            </p>
            <button
              type="button"
              className="c2s-btn-primary"
              data-testid="runtime-error-reload"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              Back to Opal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
