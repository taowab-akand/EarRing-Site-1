import { login } from "../actions";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
            {error}
          </p>
        )}
        <button className="primary">Sign in</button>
      </form>
    </main>
  );
}
