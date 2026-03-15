import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTopicIndexMarkdown, renderTopicIndexHtml } from '../lib/services/topic-render.js';

test('buildTopicIndexMarkdown sorts by updatedAt and groups by year', () => {
  const markdown = buildTopicIndexMarkdown('anime', 'Anime', [
    {
      path: 'castle-notes',
      type: 'text',
      title: 'Castle in the Sky Notes',
      updatedAt: Date.UTC(2026, 11, 21, 10, 0, 0) / 1000,
    },
    {
      path: 'howl-visual',
      type: 'html',
      title: 'Howl Visual Draft',
      updatedAt: Date.UTC(2026, 11, 23, 10, 0, 0) / 1000,
    },
    {
      path: 'poster-pack-winter.zip',
      type: 'file',
      title: 'Poster Pack Winter',
      updatedAt: Date.UTC(2025, 9, 18, 10, 0, 0) / 1000,
    },
  ]);

  assert.equal(
    markdown,
    [
      '# Anime',
      '',
      '## 2026',
      '',
      '- [Howl Visual Draft](anime/howl-visual) · 12-23',
      '- [Castle in the Sky Notes](anime/castle-notes) ☰ · 12-21',
      '',
      '## 2025',
      '',
      '- [Poster Pack Winter](anime/poster-pack-winter.zip) ◫ · 10-18',
    ].join('\n'),
  );
});

test('buildTopicIndexMarkdown uses full path fallback and type marks', () => {
  const markdown = buildTopicIndexMarkdown('anime', 'anime', [
    {
      path: 'notes/howl-visual',
      fullPath: 'anime/notes/howl-visual',
      type: 'url',
      title: '',
      updatedAt: Date.UTC(2026, 11, 19, 10, 0, 0) / 1000,
    },
  ]);

  assert.match(markdown, /\[notes\/howl-visual]\(anime\/notes\/howl-visual\) ↗ · 12-19/);
});

test('renderTopicIndexHtml uses topic title and topic-relative links', () => {
  const html = renderTopicIndexHtml('anime', 'Anime', [
    {
      path: 'howl-visual',
      type: 'html',
      title: 'Howl Visual Draft',
      updatedAt: Date.UTC(2026, 11, 23, 10, 0, 0) / 1000,
    },
  ]);

  assert.match(html, /<title>Anime<\/title>/);
  assert.match(html, /Howl Visual Draft/);
  assert.match(html, /href="anime\/howl-visual"/);
});

test('renderTopicIndexHtml keeps nested topic links relative to the topic directory', () => {
  const html = renderTopicIndexHtml('blog/2026', '2026', [
    {
      path: 'post-1',
      type: 'text',
      title: 'Post 1',
      updatedAt: Date.UTC(2026, 11, 23, 10, 0, 0) / 1000,
    },
  ]);

  assert.match(html, /href="2026\/post-1"/);
});
