import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIELD_CONCEPT_KEY, FIELD_ID, INFUSION_INPUT_ID, SECTION_ID, STAGE } from '..';

/**
 * Guards the one-place rule: no source file outside `constants/` writes a field, input,
 * section or stage id, concept key or card name as a string. Tests are exempt.
 */
const SRC = fileURLToPath(new URL('../..', import.meta.url));

// Stored JSON keys are not ids: Android's Gson names, fixed forever.
const ALLOWED: Record<string, readonly string[]> = {
  'storage/infusionJson.ts': ['infusionRate', 'infusionStatus', 'otherType'],
};

// Names inside comments are documentation, not code.
const code = (file: string): string =>
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'constants' ? [] : sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

const NAMES = [
  ...Object.values(FIELD_ID),
  ...Object.values(FIELD_CONCEPT_KEY),
  ...Object.values(INFUSION_INPUT_ID),
  ...Object.values(SECTION_ID),
  ...Object.values(STAGE),
];

describe('names live in constants/ only', () => {
  const files = sourceFiles(SRC);

  it('finds the source files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('no id or concept key is retyped as a string outside constants/', () => {
    const found: string[] = [];
    for (const file of files) {
      const path = relative(SRC, file);
      const text = code(file);
      for (const name of NAMES) {
        if (ALLOWED[path]?.includes(name)) continue;
        if (new RegExp(`(['"\`])${name}\\1`).test(text)) found.push(`${path}: '${name}'`);
      }
    }
    expect(found).toEqual([]);
  });

  it('no card or SOS name is written by hand outside constants/', () => {
    const found = files
      .filter((file) => /(['"`])Stage\d/.test(code(file)))
      .map((file) => relative(SRC, file));
    expect(found).toEqual([]);
  });
});
