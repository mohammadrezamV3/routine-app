// مرزِ خطای هر صفحه: سیگنال‌های notFound()/redirect() (shimِ next/navigation)
// رو مثلِ Next اجرا می‌کنه — not-found.tsxِ وب یا ریدایرکت — و بقیه‌ی خطاها
// رو بدونِ از کار انداختنِ کلِ اپ (تب‌بار/شل سالم می‌مونن) نشون می‌ده.
import { Component, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isNotFoundSignal, isRedirectSignal } from "@m/shims/routeSignals";
import { NotFoundPage } from "./routes";

type State = { error: unknown };

type Props = { children: ReactNode; /** با عوض‌شدنش (ناوبری) خطای قبلی پاک می‌شه */ resetKey: string };

export class RouteBoundary extends Component<Props, State> {
  state: State = { error: null };

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown): void {
    if (!isNotFoundSignal(error) && !isRedirectSignal(error)) console.error("[route]", error);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (isRedirectSignal(error)) return <Navigate to={error.url} replace />;
    if (isNotFoundSignal(error)) return <NotFoundPage />;
    return (
      <section style={{ textAlign: "center", paddingTop: 60 }}>
        <h1 style={{ fontSize: 18 }}>مشکلی پیش اومد</h1>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>این صفحه باز نشد — دوباره امتحان کن.</p>
        <p>
          <a href={window.location.pathname} style={{ color: "var(--accent)" }}>
            تلاش دوباره
          </a>
        </p>
      </section>
    );
  }
}
