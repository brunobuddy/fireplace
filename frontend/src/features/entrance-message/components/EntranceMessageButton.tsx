import { type Component, Show, createSignal } from 'solid-js';
import { useFamily } from '@/features/family/family-context';
import { buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/cn';
import { createEntranceMessageController } from '../store/entrance-message-store';
import { EntranceMessagePanel } from './EntranceMessagePanel';

/**
 * Header entry point for the entrance message: a pin icon (with a dot while a
 * message is up) that opens a sheet to read, replace or clear it.
 */
export const EntranceMessageButton: Component = () => {
  const family = useFamily();
  const ctrl = createEntranceMessageController(
    () => family.family()?.id,
    family.currentMember,
  );
  const [open, setOpen] = createSignal(false);

  const publish = async (text: string): Promise<void> => {
    if (await ctrl.actions.publish(text)) setOpen(false);
  };
  const clear = async (): Promise<void> => {
    if (await ctrl.actions.clear()) setOpen(false);
  };

  return (
    <Dialog
      open={open()}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) ctrl.actions.clearError();
      }}
    >
      <EntranceTrigger active={ctrl.state.message !== null} />
      <DialogContent>
        <SheetHeader />
        <Show when={ctrl.state.error}>
          {(error) => (
            <p role="alert" class="mt-3 text-sm font-semibold text-destructive">
              {error()}
            </p>
          )}
        </Show>
        <EntranceMessagePanel
          message={ctrl.state.message}
          saving={ctrl.state.saving}
          onPublish={(text) => void publish(text)}
          onClear={() => void clear()}
        />
      </DialogContent>
    </Dialog>
  );
};

const EntranceTrigger: Component<{ active: boolean }> = (props) => (
  <DialogTrigger
    class={cn(
      buttonVariants({ variant: 'ghost', size: 'icon' }),
      'relative h-9 w-9',
      props.active ? 'text-primary' : 'text-muted-foreground',
    )}
    aria-label="Message pour l’entrée"
  >
    <PinIcon />
    <Show when={props.active}>
      <span
        class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
        aria-hidden="true"
      />
    </Show>
  </DialogTrigger>
);

const SheetHeader: Component = () => (
  <div class="flex items-start justify-between gap-3">
    <div>
      <DialogTitle>📌 Message pour l’entrée</DialogTitle>
      <DialogDescription>
        Affiché sur l’écran près de la porte. Un seul message à la fois.
      </DialogDescription>
    </div>
    <DialogCloseButton
      class={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        '-mr-2 -mt-1 h-9 w-9 text-muted-foreground',
      )}
      aria-label="Fermer"
    >
      ✕
    </DialogCloseButton>
  </div>
);

const PinIcon: Component = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);
