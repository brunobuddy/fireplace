import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@solidjs/testing-library';
import { ApiError } from '@/lib/api/http';

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock('../auth-context', () => ({ useAuth: () => ({ login }) }));

import { LoginPage } from './LoginPage';

/** Let the submit handler's promise chain settle before the test returns. */
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const tap = (element: HTMLElement): void => {
  fireEvent.click(element, { detail: 0 });
};

/** Tap out `012587` and submit it. */
function drawPattern(getByLabelText: (text: string) => HTMLElement): void {
  for (const cell of [0, 1, 2, 5, 8, 7]) {
    tap(getByLabelText(`Point ${cell + 1} sur 9`));
  }
}

describe('<LoginPage>', () => {
  it('submits the trimmed email and the canonical pattern', async () => {
    login.mockReset();
    login.mockResolvedValue(undefined);
    const { getByLabelText, getByRole } = render(() => <LoginPage />);

    fireEvent.input(getByLabelText('E-mail'), {
      target: { value: '  a@x.io ' },
    });
    drawPattern(getByLabelText);
    fireEvent.click(getByRole('button', { name: /valider/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('a@x.io', '012587'));
    await flush();
  });

  it('shows an error message when the pattern is wrong', async () => {
    login.mockReset();
    login.mockRejectedValue(new ApiError(401, 'bad credentials'));
    const { getByLabelText, getByRole, findByRole } = render(() => (
      <LoginPage />
    ));

    fireEvent.input(getByLabelText('E-mail'), { target: { value: 'a@x.io' } });
    drawPattern(getByLabelText);
    fireEvent.click(getByRole('button', { name: /valider/i }));

    const alert = await findByRole('alert');
    expect(alert).toHaveTextContent(/e-mail ou schéma incorrect/i);
    await flush();
  });

  it('tells the user to wait when the login endpoint locks them out', async () => {
    login.mockReset();
    login.mockRejectedValue(new ApiError(429, 'Too Many Requests'));
    const { getByLabelText, getByRole, findByRole } = render(() => (
      <LoginPage />
    ));

    fireEvent.input(getByLabelText('E-mail'), { target: { value: 'a@x.io' } });
    drawPattern(getByLabelText);
    fireEvent.click(getByRole('button', { name: /valider/i }));

    const alert = await findByRole('alert');
    expect(alert).toHaveTextContent(/trop de tentatives/i);
    await flush();
  });

  it('does not call login when the email is missing', async () => {
    login.mockReset();
    const { getByLabelText, getByRole, findByRole } = render(() => (
      <LoginPage />
    ));

    drawPattern(getByLabelText);
    fireEvent.click(getByRole('button', { name: /valider/i }));

    const alert = await findByRole('alert');
    expect(alert).toHaveTextContent(/entre ton e-mail/i);
    expect(login).not.toHaveBeenCalled();
    await flush();
  });
});
