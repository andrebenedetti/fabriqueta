import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "./button";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="empty-placeholder">
            <h3>Something went wrong</h3>
            <p>{this.state.error?.message ?? "An unexpected error occurred."}</p>
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              type="button"
            >
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
