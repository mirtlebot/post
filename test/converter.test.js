import test from 'node:test';
import assert from 'node:assert/strict';
import { convertMarkdownToHtml } from '../lib/utils/converter.js';

test('convertMarkdownToHtml writes page title and topic backlink', () => {
  const html = convertMarkdownToHtml('# Hello', {
    pageTitle: 'Anime Archive',
    topicBackLink: '/anime',
    topicBackLabel: 'Anime',
  });

  assert.match(html, /<title>Anime Archive<\/title>/);
  assert.match(html, /href="\/anime"/);
  assert.match(html, /◂/);
  assert.match(html, /Back to &lt;Anime&gt;/);
});

test('convertMarkdownToHtml escapes backlink label markdown characters', () => {
  const html = convertMarkdownToHtml('# Hello', {
    pageTitle: 'Escaped',
    topicBackLink: '/anime',
    topicBackLabel: '<Anime>',
  });

  assert.match(html, /Back to &lt;&lt;Anime&gt;&gt;/);
});

test('convertMarkdownToHtml keeps empty title tag when pageTitle is missing', () => {
  const html = convertMarkdownToHtml('# Hello');

  assert.match(html, /<title><\/title>/);
});
