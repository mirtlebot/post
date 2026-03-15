import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import {
  buildStoredValue,
  parseStoredValue,
  previewContent,
  parseRequestBody,
} from '../lib/utils/storage.js';

test('buildStoredValue stores typed values', () => {
  assert.equal(
    buildStoredValue({ type: 'url', content: 'https://example.com', title: 'Greeting' }),
    '{"type":"url","content":"https://example.com","title":"Greeting"}',
  );
});

test('parseStoredValue reads stored JSON values', () => {
  assert.deepEqual(parseStoredValue('{"type":"html","content":"<h1>Hello</h1>","title":"Hello"}'), {
    type: 'html',
    content: '<h1>Hello</h1>',
    title: 'Hello',
  });
});

test('parseStoredValue rejects non-JSON stored values', () => {
  assert.throws(() => parseStoredValue('plain text'));
});

test('previewContent keeps url intact and truncates text', () => {
  assert.equal(previewContent('url', 'https://example.com/path'), 'https://example.com/path');
  assert.equal(previewContent('text', '1234567890123456'), '123456789012345...');
});

test('parseRequestBody rejects invalid json', async () => {
  const request = new EventEmitter();
  const bodyPromise = parseRequestBody(request);
  request.emit('data', Buffer.from('{bad json'));
  request.emit('end');
  await assert.rejects(bodyPromise);
});
