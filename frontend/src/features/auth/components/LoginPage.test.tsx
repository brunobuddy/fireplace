import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@solidjs/testing-library';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('../auth-context', () => ({ useAuth: () => ({ login }) }));

import { LoginPage } from './LoginPage';

/** Let the submit handler's promise chain settle before the test returns. */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('<LoginPage>', () => {
  it('submits the trimmed email and password', async () => {
    login.mockReset();
    login.mockResolvedValue(undefined);
    const { getByLabelText, getByRole } = render(() => <LoginPage />);

    fireEvent.input(getByLabelText('E-mail'), {
      target: { value: '  a@x.io ' },
    });
    fireEvent.input(getByLabelText('Mot de passe'), {
      target: { value: 'pw' },
    });
    fireEvent.click(getByRole('button', { name: /se connecter/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('a@x.io', 'pw'));
    await flush();
  });

  it('shows an error message when login fails', async () => {
    login.mockReset();
    login.mockRejectedValue(new Error('bad credentials'));
    const { getByLabelText, getByRole, findByRole } = render(() => (
      <LoginPage />
    ));

    fireEvent.input(getByLabelText('E-mail'), { target: { value: 'a@x.io' } });
    fireEvent.input(getByLabelText('Mot de passe'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(getByRole('button', { name: /se connecter/i }));

    const alert = await findByRole('alert');
    expect(alert).toHaveTextContent(/e-mail ou mot de passe incorrect/i);
    await flush();
  });
});
