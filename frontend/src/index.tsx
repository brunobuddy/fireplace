/* @refresh reload */
import '@fontsource-variable/nunito';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import './app.css';
import { render } from 'solid-js/web';
import { App } from './App';
import { registerServiceWorker } from './lib/register-sw';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root not found');
}

render(() => <App />, root);

registerServiceWorker();
