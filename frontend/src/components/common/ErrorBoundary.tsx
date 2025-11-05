import React from "react";

type Props = { children: React.ReactNode, fallback?: React.ReactNode };
type State = { hasError: boolean, msg?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(err: any) {
    return { hasError: true, msg: err?.message || "Something went wrong." };
  }
  componentDidCatch(err: any) {
    // optional: console.error(err);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
          <div style={{ opacity: 0.8, fontSize: 14 }}>{this.state.msg}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

