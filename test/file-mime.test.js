import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectContentTypeFromBuffer,
  detectContentTypeFromExtension,
  GENERIC_CONTENT_TYPES,
  isTrustedClientContentType,
  resolveUploadedFileContentType,
} from '../lib/utils/file-mime.js';

test('generic content type set includes known generic values', () => {
  assert.equal(GENERIC_CONTENT_TYPES.has('application/octet-stream'), true);
  assert.equal(GENERIC_CONTENT_TYPES.has('binary/octet-stream'), true);
});

test('trusted client content type keeps explicit text type unchanged', () => {
  assert.equal(isTrustedClientContentType('text/plain'), true);
});

test('trusted client content type keeps explicit image type unchanged', () => {
  assert.equal(isTrustedClientContentType('image/png'), true);
});

test('generic client content type is not trusted', () => {
  assert.equal(isTrustedClientContentType('application/octet-stream'), false);
});

test('detectContentTypeFromExtension resolves text types with utf-8 charset', () => {
  assert.equal(detectContentTypeFromExtension('note.txt'), 'text/plain; charset=utf-8');
  assert.equal(detectContentTypeFromExtension('data.json'), 'application/json; charset=utf-8');
  assert.equal(detectContentTypeFromExtension('readme.md'), 'text/markdown; charset=utf-8');
  assert.equal(detectContentTypeFromExtension('app.js'), 'text/javascript; charset=utf-8');
});

test('detectContentTypeFromExtension resolves svg without file sniffing', () => {
  assert.equal(detectContentTypeFromExtension('icon.svg'), 'image/svg+xml');
});

test('detectContentTypeFromBuffer detects binary signatures', () => {
  assert.equal(detectContentTypeFromBuffer(Buffer.from('%PDF-1.7\n')), 'application/pdf');
  assert.equal(
    detectContentTypeFromBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/png',
  );
  assert.equal(detectContentTypeFromBuffer(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
  assert.equal(detectContentTypeFromBuffer(Buffer.from('GIF89a', 'ascii')), 'image/gif');
  assert.equal(
    detectContentTypeFromBuffer(Buffer.from('RIFFxxxxWEBPVP8 ', 'ascii')),
    'image/webp',
  );
  assert.equal(
    detectContentTypeFromBuffer(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    'application/zip',
  );
});

test('resolveUploadedFileContentType keeps explicit trusted client type unchanged', async () => {
  const result = await resolveUploadedFileContentType({
    clientContentType: 'text/plain',
    originalFilename: 'note.txt',
  });

  assert.equal(result, 'text/plain');
});

test('resolveUploadedFileContentType rewrites generic client type using extension mapping', async () => {
  const textResult = await resolveUploadedFileContentType({
    clientContentType: 'application/octet-stream',
    originalFilename: 'note.txt',
  });
  const pdfResult = await resolveUploadedFileContentType({
    clientContentType: 'application/octet-stream',
    originalFilename: 'paper.pdf',
  });

  assert.equal(textResult, 'text/plain; charset=utf-8');
  assert.equal(pdfResult, 'application/pdf');
});

test('resolveUploadedFileContentType uses file signature from buffer when extension is missing', async () => {
  const result = await resolveUploadedFileContentType({
    clientContentType: 'application/octet-stream',
    prefixBuffer: Buffer.from('%PDF-1.7\n'),
  });

  assert.equal(result, 'application/pdf');
});

test('resolveUploadedFileContentType uses file signature from filepath when extension is missing', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'post-file-mime-'));
  const filePath = join(tempDir, 'upload.bin');

  try {
    await writeFile(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const result = await resolveUploadedFileContentType({
      clientContentType: '',
      filepath: filePath,
    });

    assert.equal(result, 'image/png');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('resolveUploadedFileContentType falls back to octet-stream when nothing is recognizable', async () => {
  const result = await resolveUploadedFileContentType({
    clientContentType: '',
    originalFilename: 'unknown',
    prefixBuffer: Buffer.from('plain unknown body', 'utf8'),
  });

  assert.equal(result, 'application/octet-stream');
});
