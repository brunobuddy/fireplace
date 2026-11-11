import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';
import type { EntranceMessage } from '@/lib/types';
import { EntranceMessagePanel } from './EntranceMessagePanel';

const message: EntranceMessage = {
  text: 'Pense aux clés',
  authorId: 'm',
  authorName: 'Audrey',
  updatedAt: new Date().toISOString(),
};

const setup = (current: EntranceMessage | null, saving = false) => {
  const onPublish = vi.fn();
  const onClear = vi.fn();
  const utils = render(() => (
    <EntranceMessagePanel
      message={current}
      saving={saving}
      onPublish={onPublish}
      onClear={onClear}
    />
  ));
  return { ...utils, onPublish, onClear };
};

describe('<EntranceMessagePanel>', () => {
  it('shows the current message with its author and time', () => {
    const { getByText } = setup(message);
    expect(getByText('Pense aux clés')).toBeInTheDocument();
    expect(getByText(/par Audrey · à l’instant/)).toBeInTheDocument();
  });

  it('shows an empty state and no clear button without a message', () => {
    const { getByText, queryByRole } = setup(null);
    expect(getByText(/Aucun message affiché/)).toBeInTheDocument();
    expect(queryByRole('button', { name: 'Effacer' })).toBeNull();
  });

  it('counts characters live and publishes the draft', () => {
    const { getByLabelText, getByRole, getByText, onPublish } = setup(null);
    const submit = getByRole('button', { name: 'Afficher sur l’entrée' });
    expect(submit).toBeDisabled();

    fireEvent.input(getByLabelText('Nouveau message'), {
      target: { value: 'Dîner à 20h' },
    });
    expect(getByText('11 / 280')).toBeInTheDocument();
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);
    expect(onPublish).toHaveBeenCalledWith('Dîner à 20h');
  });

  it('seeds the draft with the current text and waits for a change', () => {
    const { getByLabelText, getByRole } = setup(message);
    expect(getByLabelText('Nouveau message')).toHaveValue('Pense aux clés');
    expect(
      getByRole('button', { name: 'Afficher sur l’entrée' }),
    ).toBeDisabled();
  });

  it('clears via the Effacer button', () => {
    const { getByRole, onClear } = setup(message);
    fireEvent.click(getByRole('button', { name: 'Effacer' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('locks the buttons while saving', () => {
    const { getByRole } = setup(message, true);
    expect(getByRole('button', { name: 'Effacer' })).toBeDisabled();
  });
});
