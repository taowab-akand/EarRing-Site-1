export const authMessages = {
  configuration: 'Authentication configuration is unavailable. Contact the store owner.',
  credentials: 'Email or password was not accepted.',
  authentication: 'Authentication failed. Contact the store owner with the diagnostic reference.',
  session: 'Your session could not be established. Please try again.',
  database: 'Administrator permissions could not be checked. Please try again later.',
  permission: 'This account does not have Administrator Studio access.',
  unavailable: 'The authentication service could not be reached. Please try again later.',
};
export type AuthStage = keyof typeof authMessages;
export class AdminAccessError extends Error {
  stage: AuthStage;
  constructor(stage: AuthStage) { super(stage); this.stage = stage; }
}
export function authenticationStage(code?: string): AuthStage {
  return code === 'invalid_credentials' ? 'credentials' : 'authentication';
}
// Log only constrained provider codes/status, never messages, sessions or inputs.
export function diagnostic(stage: AuthStage, error?: unknown) {
  const reference = crypto.randomUUID();
  const e = error as {code?: unknown; status?: unknown} | undefined;
  const code = typeof e?.code === 'string' && /^[a-zA-Z0-9_]{1,64}$/.test(e.code) ? e.code : undefined;
  const status = typeof e?.status === 'number' ? e.status : undefined;
  console.error('admin_login', {reference, stage, code, status});
  return reference;
}
