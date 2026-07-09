import { type Component, Show, createSignal } from 'solid-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/ui/text-field';
import { ApiError } from '@/lib/api/http';
import { useAuth } from '../auth-context';
import { PatternLock } from './PatternLock';

/** The login gate: warm, on-brand, and the only view shown when signed out. */
export const LoginPage: Component = () => {
  const { login } = useAuth();
  const [email, setEmail] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  // Kept synchronous (returns void): the rejection handler is attached to the
  // login promise in the same tick, so a failed login can never surface as an
  // unhandled rejection.
  const onPattern = (pattern: string): void => {
    if (busy()) {
      return;
    }
    const address = email().trim();
    if (!address) {
      setError('Entre ton e-mail.');
      return;
    }
    setError(null);
    setBusy(true);
    void login(address, pattern)
      .catch((cause: unknown) => setError(messageFor(cause)))
      .finally(() => setBusy(false));
  };

  return (
    <div class="flex min-h-screen items-center justify-center px-4 py-10">
      <Card class="w-full max-w-sm">
        <CardHeader class="items-center gap-2 text-center">
          <span class="text-4xl" aria-hidden="true">
            🔥
          </span>
          <CardTitle class="text-2xl">Fireplace</CardTitle>
          <p class="text-sm text-muted-foreground">Connecte-toi à ton foyer.</p>
        </CardHeader>
        <CardContent>
          <form
            class="flex flex-col gap-4"
            onSubmit={(event) => event.preventDefault()}
          >
            <TextField value={email()} onChange={setEmail}>
              <TextFieldLabel>E-mail</TextFieldLabel>
              <TextFieldInput
                type="email"
                autocomplete="username"
                placeholder="toi@famille.app"
                required
              />
            </TextField>

            <div class="flex flex-col gap-2">
              <p class="text-sm font-medium">Schéma</p>
              <PatternLock onComplete={onPattern} disabled={busy()} />
            </div>

            <Show when={error()}>
              {(message) => (
                <p role="alert" class="text-sm font-semibold text-destructive">
                  {message()}
                </p>
              )}
            </Show>
            <Show when={busy()}>
              <p class="text-center text-sm text-muted-foreground">Connexion…</p>
            </Show>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * A lockout has to read differently from a wrong schéma, or the one person who
 * genuinely mistyped will keep drawing into a wall with no idea why.
 */
function messageFor(cause: unknown): string {
  if (cause instanceof ApiError && cause.status === 429) {
    return 'Trop de tentatives. Réessaie dans quelques minutes.';
  }
  return 'E-mail ou schéma incorrect.';
}
