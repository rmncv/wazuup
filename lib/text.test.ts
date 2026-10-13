import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldShow, extractContext, parseSections } from './text.ts';

test('shouldShow', () => {
  assert.equal(shouldShow('serendipity'), true);
  assert.equal(shouldShow('  break the ice '), true);
  assert.equal(shouldShow('123.45'), false);
  assert.equal(shouldShow('—!?'), false);
  assert.equal(shouldShow(''), false);
  assert.equal(shouldShow('a'.repeat(301)), false);
  assert.equal(shouldShow('слово'), true);
});

test('extractContext picks the containing sentence', () => {
  const block = 'First one. He decided to break the ice at the party! Last one here.';
  assert.equal(extractContext(block, 'break the ice'), 'He decided to break the ice at the party!');
  assert.equal(extractContext('Just a phrase', 'phrase'), 'Just a phrase');
  assert.equal(extractContext('Whatever.', 'missing'), 'missing');
});

test('extractContext caps long unpunctuated text', () => {
  const block = 'word '.repeat(300) + 'target ' + 'word '.repeat(300);
  const out = extractContext(block, 'target');
  assert.ok(out.length <= 502, `len ${out.length}`);
  assert.ok(out.includes('target'));
});

test('parseSections', () => {
  const raw = 'In context: a way to start talking.\n**General:** (idiom) to ease\ntension\nExample: "Jokes break the ice."';
  assert.deepEqual(parseSections(raw), [
    { label: 'In context', body: 'a way to start talking.' },
    { label: 'General', body: '(idiom) to ease tension' },
    { label: 'Example', body: '"Jokes break the ice."' },
  ]);
  assert.deepEqual(parseSections('In cont'), [{ label: '', body: 'In cont' }]);
});
