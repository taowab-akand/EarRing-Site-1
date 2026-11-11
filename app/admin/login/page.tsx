import { login } from "../actions";
import {authMessages, type AuthStage} from '@/lib/auth-errors';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reference?: string }>;
}) {
  const { error, reference } = await searchParams;
  const message = error && Object.hasOwn(authMessages,error) ? authMessages[error as AuthStage] : error ? 'Sign in failed. Please try again.' : '';
  return (
    <main className="login">
      <a className="brand" href="/">
        EarRing
      </a>
      <h1 style={{ fontSize: 36 }}>Admin Studio</h1>
      <p>Sign in to look after your collection.</p>
      <form action={login} className="form">
        <label>
          Email
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {message}
            {reference && /^[a-f0-9-]{36}$/.test(reference) && <small>Diagnostic reference: {reference}</small>}
          </p>
        )}
        <button className="primary">Sign in</button>
      </form>
    </main>
  );
}
