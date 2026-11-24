// Run by `npm run lint` (node --test). ESLint replaces a rule in an override instead of merging it, so a new override
// can silently switch an older rule off. This lints small samples at real file paths and checks every rule still
// fires where it should. Plain Node, not jest: the Expo jest setup replaces a global ESLint needs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ESLint } = require('eslint');

const eslint = new ESLint({ cwd: __dirname });

const LABOUR_DOMAIN = 'src/features/labour-care-guide/domain/timelineModel.ts';
const LABOUR_REPOSITORY = 'src/features/labour-care-guide/data/labourRepository.ts';
const LABOUR_SCREEN = 'src/features/labour-care-guide/screens/TimelineScreen.tsx';
const CARD_WRITER = 'src/core/db/card.ts';
const CARD_SCAN = 'src/core/services/cardGeneration/scan.ts';
const OUTSIDE_LABOUR = 'src/core/utils/jwt.ts';

async function ruleIds(code, file) {
  const [result] = await eslint.lintText(code, { filePath: path.join(__dirname, file) });
  return result.messages.map((m) => m.ruleId);
}

const PROPS = 'no-restricted-properties';
const TS_IMPORTS = '@typescript-eslint/no-restricted-imports';

test('Date.now() is refused in labour and the card services, allowed elsewhere', async () => {
  const code = 'export const at = Date.now();\n';
  assert.ok((await ruleIds(code, LABOUR_DOMAIN)).includes(PROPS));
  assert.ok((await ruleIds(code, CARD_SCAN)).includes(PROPS));
  assert.ok(!(await ruleIds(code, OUTSIDE_LABOUR)).includes(PROPS));
});

test('only core/db/card.ts writes a card', async () => {
  const code = 'declare const encounterRepo: { insertCard(): void };\nencounterRepo.insertCard();\n';
  assert.ok((await ruleIds(code, LABOUR_REPOSITORY)).includes(PROPS));
  assert.ok(!(await ruleIds(code, CARD_WRITER)).includes(PROPS));
});

test('only the labour repository writes an SOS card', async () => {
  const code = 'declare const encounterRepo: { insertSos(): void };\nencounterRepo.insertSos();\n';
  assert.ok((await ruleIds(code, CARD_SCAN)).includes(PROPS));
  assert.ok(!(await ruleIds(code, LABOUR_REPOSITORY)).includes(PROPS));
});

test('Text comes from core/ui, not react-native', async () => {
  const code = "import { Text } from 'react-native';\nexport { Text };\n";
  assert.ok((await ruleIds(code, LABOUR_SCREEN)).includes(TS_IMPORTS));
  assert.ok(!(await ruleIds(code, 'src/core/ui/Text.tsx')).includes(TS_IMPORTS));
});

test('Modal is used only by the shared dialogs', async () => {
  const code = "import { Modal } from 'react-native';\nexport { Modal };\n";
  assert.ok((await ruleIds(code, LABOUR_SCREEN)).includes(TS_IMPORTS));
  assert.ok(!(await ruleIds(code, 'src/core/ui/ConfirmDialog.tsx')).includes(TS_IMPORTS));
});

test('ToastAndroid only through the toast helper', async () => {
  const code = "import { ToastAndroid } from 'react-native';\nexport { ToastAndroid };\n";
  assert.ok((await ruleIds(code, LABOUR_SCREEN)).includes(TS_IMPORTS));
  assert.ok(!(await ruleIds(code, 'src/core/utils/toast.ts')).includes(TS_IMPORTS));
});

test('the database rules still fire where the new overrides apply', async () => {
  const code = 'declare const db: { transaction(f: () => void): void };\ndb.transaction(() => undefined);\n';
  assert.ok((await ruleIds(code, LABOUR_REPOSITORY)).includes('no-restricted-syntax'));
  assert.ok((await ruleIds(code, CARD_WRITER)).includes('no-restricted-syntax'));
});

test('the date-library rule still fires in labour', async () => {
  const code = "import dayjs from 'dayjs';\nexport { dayjs };\n";
  assert.ok((await ruleIds(code, LABOUR_DOMAIN)).includes('no-restricted-imports'));
});
