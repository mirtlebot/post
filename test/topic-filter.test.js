import test from 'node:test';
import assert from 'node:assert/strict';
import { filterItemsByTopic } from '../web/src/lib/topic-filter.js';

test('filterItemsByTopic keeps topic itself first and includes topic members only', () => {
  const items = [
    { path: 'zeta', type: 'text' },
    { path: 'topic/child-b', type: 'text' },
    { path: 'topic', type: 'topic' },
    { path: 'topic/child-a', type: 'text' },
    { path: 'topic-other', type: 'topic' },
  ];

  assert.deepEqual(
    filterItemsByTopic(items, 'topic').map((item) => item.path),
    ['topic', 'topic/child-b', 'topic/child-a'],
  );
});

test('filterItemsByTopic returns original items when no topic is selected', () => {
  const items = [{ path: 'topic', type: 'topic' }, { path: 'topic/child', type: 'text' }];
  assert.equal(filterItemsByTopic(items, ''), items);
});
