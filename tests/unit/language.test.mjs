import test from 'node:test';
import assert from 'node:assert/strict';
import { getLanguageLabel, normalizeEventLanguage } from '../../modules/language.mjs';

test('getLanguageLabel returns expected UA labels', () => {
  assert.equal(getLanguageLabel('uk'), 'Українська');
  assert.equal(getLanguageLabel('en'), 'Англійська');
  assert.equal(getLanguageLabel('da'), 'Данська');
  assert.equal(getLanguageLabel('uk/en'), 'Українська/Англійська');
  assert.equal(getLanguageLabel('uk/da'), 'Українська/Данська');
  assert.equal(getLanguageLabel('en/da'), 'Англійська/Данська');
  assert.equal(getLanguageLabel('mixed'), 'Українська/Англійська');
});

test('normalizeEventLanguage keeps supported combinations and maps mixed', () => {
  assert.equal(normalizeEventLanguage('uk/en'), 'uk/en');
  assert.equal(normalizeEventLanguage('en/da'), 'en/da');
  assert.equal(normalizeEventLanguage('uk/da'), 'uk/da');
  assert.equal(normalizeEventLanguage('mixed'), 'uk/en');
});
