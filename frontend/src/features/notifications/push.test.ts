import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
  it('decodes plain base64', () => {
    // btoa('hello') === 'aGVsbG8='
    expect([...urlBase64ToUint8Array('aGVsbG8=')]).toEqual([
      104, 101, 108, 108, 111,
    ]);
  });

  it('decodes the base64url alphabet and restores missing padding', () => {
    // 0xfb 0xef 0xff encodes as '++//' in base64 → '--__' in base64url.
    expect([...urlBase64ToUint8Array('--__')]).toEqual([0xfb, 0xef, 0xff]);
    // Unpadded VAPID-style string: 'TWFu' -> 'Man', truncated to 'TWFuTQ' -> 'ManM'.
    expect([...urlBase64ToUint8Array('TWFuTQ')]).toEqual([77, 97, 110, 77]);
  });

  it('round-trips a realistic unpadded VAPID public key', () => {
    const bytes = Array.from({ length: 65 }, (_, i) => i);
    const base64url = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect([...urlBase64ToUint8Array(base64url)]).toEqual(bytes);
  });
});
