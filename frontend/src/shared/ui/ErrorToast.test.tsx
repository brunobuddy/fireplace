import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import { ErrorToast } from './ErrorToast';

describe('<ErrorToast>', () => {
  it('renders nothing when there is no message', () => {
    const { queryByRole } = render(() => (
      <ErrorToast message={null} onDismiss={vi.fn()} />
    ));
    expect(queryByRole('alert')).toBeNull();
  });

  it('shows the message and calls onDismiss when closed', () => {
    const onDismiss = vi.fn();
    const { getByRole } = render(() => (
      <ErrorToast
        message="Impossible de joindre le serveur"
        onDismiss={onDismiss}
      />
    ));

    expect(getByRole('alert')).toHaveTextContent(
      'Impossible de joindre le serveur',
    );
    fireEvent.click(getByRole('button', { name: /fermer/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
