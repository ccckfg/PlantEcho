import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ui] render failed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="grid h-screen place-items-center bg-background px-xl text-on-surface">
        <section className="max-w-xl rounded-md bg-surface-container-lowest p-xl shadow-soft ring-1 ring-error/20">
          <p className="mb-sm font-display text-headline-md text-error">页面渲染遇到问题</p>
          <p className="font-body text-body-md leading-relaxed text-on-surface-variant">
            {this.state.error.message || "未知渲染错误"}
          </p>
        </section>
      </div>
    );
  }
}
