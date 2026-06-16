import { type Component, For, Show } from 'solid-js';
import { useFamily } from '@/features/family/family-context';
import { Spinner } from '@/shared/ui/Spinner';
import { ErrorToast } from '@/shared/ui/ErrorToast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { createGroceriesController } from '../store/groceries-store';
import { AddItemBar } from './AddItemBar';
import { CategorySection } from './CategorySection';
import { CartSummary } from './CartSummary';
import { EmptyState } from './EmptyState';

/** The grocery screen — wires the family identity to the realtime store. */
export const GroceryListView: Component = () => {
  const family = useFamily();
  const ctrl = createGroceriesController(
    () => family.family()?.id,
    family.currentMember,
  );

  const total = (): number => ctrl.remaining() + ctrl.cart().length;
  const progress = (): number =>
    total() === 0 ? 0 : Math.round((ctrl.cart().length / total()) * 100);

  return (
    <Show
      when={ctrl.state.status !== 'loading'}
      fallback={<Spinner label="Préparation de ta liste…" />}
    >
      <Show
        when={ctrl.state.status !== 'error'}
        fallback={
          <div class="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <p class="font-semibold text-destructive">{ctrl.state.error}</p>
            <Button onClick={() => void ctrl.actions.reload()}>
              Réessayer
            </Button>
          </div>
        }
      >
        <AddItemBar onAdd={(input) => void ctrl.actions.addItem(input)} />
        <ErrorToast
          message={ctrl.state.error}
          onDismiss={() => ctrl.actions.clearError()}
        />

        <Show when={total() > 0}>
          <div class="mb-5 flex items-center gap-3 px-1">
            <Progress value={progress()} />
            <span class="whitespace-nowrap text-xs font-extrabold text-muted-foreground">
              {ctrl.cart().length}/{total()} dans le panier
            </span>
          </div>
        </Show>

        <Show
          when={ctrl.remaining() > 0}
          fallback={
            <Show when={ctrl.cart().length === 0}>
              <EmptyState />
            </Show>
          }
        >
          <For each={ctrl.groups()}>
            {(group) => (
              <CategorySection
                group={group}
                categories={ctrl.state.categories}
                items={ctrl.state.items}
                onToggle={(i) => void ctrl.actions.toggle(i)}
                onRemove={(i) => void ctrl.actions.remove(i)}
                onMove={(i, c) => void ctrl.actions.move(i, c)}
              />
            )}
          </For>
        </Show>

        <Show when={ctrl.remaining() === 0 && ctrl.cart().length > 0}>
          <div class="animate-pop-in py-10 text-center font-display text-lg font-extrabold text-success">
            🎉 Tout est dans le panier !
          </div>
        </Show>

        <CartSummary
          cart={ctrl.cart()}
          categories={ctrl.state.categories}
          onToggle={(i) => void ctrl.actions.toggle(i)}
          onRemove={(i) => void ctrl.actions.remove(i)}
          onMove={(i, c) => void ctrl.actions.move(i, c)}
          onClear={() => void ctrl.actions.clearCart()}
        />
      </Show>
    </Show>
  );
};
