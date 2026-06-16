import { type Component, Show, createSignal } from 'solid-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from '@/components/ui/text-field';
import { useAuth } from '../auth-context';

/** The login gate: warm, on-brand, and the only view shown when signed out. */
export const LoginPage: Component = () => {
  const { login } = useAuth();
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  // Kept synchronous (returns void): the rejection handler is attached to the
  // login promise in the same tick, so a failed login can never surface as an
  // unhandled rejection.
  const onSubmit = (event: Event): void => {
    event.preventDefault();
    if (busy()) {
      return;
    }
    setError(null);
    setBusy(true);
    void login(email().trim(), password())
      .catch(() => setError('E-mail ou mot de passe incorrect.'))
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
          <form class="flex flex-col gap-4" onSubmit={onSubmit}>
            <TextField value={email()} onChange={setEmail}>
              <TextFieldLabel>E-mail</TextFieldLabel>
              <TextFieldInput
                type="email"
                autocomplete="username"
                placeholder="toi@famille.app"
                required
              />
            </TextField>
            <TextField value={password()} onChange={setPassword}>
              <TextFieldLabel>Mot de passe</TextFieldLabel>
              <TextFieldInput
                type="password"
                autocomplete="current-password"
                placeholder="••••••••"
                required
              />
            </TextField>
            <Show when={error()}>
              {(message) => (
                <p role="alert" class="text-sm font-semibold text-destructive">
                  {message()}
                </p>
              )}
            </Show>
            <Button type="submit" disabled={busy()} class="mt-1">
              {busy() ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
