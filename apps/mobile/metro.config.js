// Metro config for running apps/mobile inside an npm-workspaces monorepo.
// Without this, Metro only looks at apps/mobile/node_modules and can't see
// hoisted deps at the repo root, and can't resolve `@ezazi/*` workspace
// packages that live in ../../packages/*.
//
// Reference: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Drizzle: allow importing bundled .sql migration files (with babel inline-import).
config.resolver.sourceExts.push('sql');

// #1 — watch the whole workspace, not just this app, so edits to
// packages/@ezazi/* trigger a Fast Refresh.
config.watchFolders = [workspaceRoot];

// #2 — let Metro resolve modules hoisted to the workspace root as well as
// this app's own node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// #3 — stop Metro walking up from an arbitrary file to find the "nearest"
// node_modules (which breaks package hoisting assumptions in workspaces).
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
