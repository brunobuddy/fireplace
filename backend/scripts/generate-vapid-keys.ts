/**
 * Generate a VAPID key pair for Web Push and print it as ready-to-paste env
 * lines. Run once per deployment; the public key also reaches browsers via
 * `GET /api/notifications/public-key`, so nothing else needs it.
 *
 *   npm run push:generate-vapid --workspace=backend
 */
import * as webPush from 'web-push';

const keys = webPush.generateVAPIDKeys();

console.log('Add these to your environment (.env / Railway):\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('# Optional contact for push services (mailto: or https:):');
console.log('# VAPID_SUBJECT=mailto:you@example.com');
