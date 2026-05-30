import { LoginForm } from "../../components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="login-title">
        <h1 id="login-title">Sign in</h1>
        <p>Access your BimeBazar performance tasks, profile, and role-based workspace.</p>
        <LoginForm />
      </section>
    </main>
  );
}
