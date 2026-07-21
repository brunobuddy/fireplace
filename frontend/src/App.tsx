import { type Component, type JSX, Show } from 'solid-js';
import { Navigate, Route, Router } from '@solidjs/router';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { FamilyProvider } from '@/features/family/family-context';
import { AppShell } from '@/shared/layout/AppShell';
import { GroceryListView } from '@/features/groceries/components/GroceryListView';
import { TodoListView } from '@/features/todos/components/TodoListView';
import { SparkView } from '@/features/spark/components/SparkView';
import { ProjectsPage } from '@/features/projects/components/ProjectsPage';

/** Persistent chrome wrapping every routed family view. */
const Shell: Component<{ children?: JSX.Element }> = (props) => (
  <AppShell>{props.children}</AppShell>
);

/** The full app, mounted only once a session exists. */
const AuthenticatedApp: Component = () => (
  <FamilyProvider>
    <Router root={Shell}>
      <Route path="/" component={() => <Navigate href="/groceries" />} />
      <Route path="/groceries" component={GroceryListView} />
      <Route path="/todos" component={TodoListView} />
      <Route path="/spark" component={SparkView} />
      <Route path="/projects" component={ProjectsPage} />
      <Route path="*" component={() => <Navigate href="/groceries" />} />
    </Router>
  </FamilyProvider>
);

/** Login gate: show the app when authenticated, the login screen otherwise. */
const Gate: Component = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Show when={isAuthenticated()} fallback={<LoginPage />}>
      <AuthenticatedApp />
    </Show>
  );
};

export const App: Component = () => (
  <AuthProvider>
    <Gate />
  </AuthProvider>
);
