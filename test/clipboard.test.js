import test from 'node:test';
import assert from 'node:assert/strict';
import { getImageFileFromClipboard } from '../web/src/lib/clipboard.js';

test('getImageFileFromClipboard prefers image items from clipboard items', () => {
  const imageFile = { name: 'paste.png', type: 'image/png' };
  const result = getImageFileFromClipboard({
    items: [
      { kind: 'string', type: 'text/plain', getAsFile() { return null; } },
      { kind: 'file', type: 'image/png', getAsFile() { return imageFile; } },
    ],
    files: [],
  });

  assert.equal(result, imageFile);
});

test('getImageFileFromClipboard falls back to clipboard files', () => {
  const imageFile = { name: 'fallback.webp', type: 'image/webp' };
  const result = getImageFileFromClipboard({
    items: [],
    files: [
      { name: 'note.txt', type: 'text/plain' },
      imageFile,
    ],
  });

  assert.equal(result, imageFile);
});

test('getImageFileFromClipboard returns null when clipboard has no image', () => {
  const result = getImageFileFromClipboard({
    items: [{ kind: 'string', type: 'text/plain', getAsFile() { return null; } }],
    files: [{ name: 'note.txt', type: 'text/plain' }],
  });

  assert.equal(result, null);
});
