import { type Component } from 'solid-js';
import { Navigate, Route, Router } from '@solidjs/router';
import { FamilyProvider } from '@/features/family/family-context';
import { AppShell } from '@/shared/layout/AppShell';
import { GroceryListView } from '@/features/groceries/components/GroceryListView';
import { PlaceholderPage } from '@/routes/PlaceholderPage';

/** Persistent chrome wrapping every routed family view. */
const Shell: Component<{ children?: import('solid-js').JSX.Element }> = (
  props,
) => <AppShell>{props.children}</AppShell>;

export const App: Component = () => (
  <FamilyProvider>
    <Router root={Shell}>
      <Route path="/" component={() => <Navigate href="/groceries" />} />
      <Route path="/groceries" component={GroceryListView} />
      <Route
        path="/agenda"
        component={() => <PlaceholderPage title="Agenda" icon="📅" />}
      />
      <Route
        path="/chat"
        component={() => <PlaceholderPage title="Chat" icon="💬" />}
      />
      <Route path="*" component={() => <Navigate href="/groceries" />} />
    </Router>
  </FamilyProvider>
);
