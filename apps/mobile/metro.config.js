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

// #1 — watch packages/@ezazi/* (not this app, Metro already watches its own
// projectRoot) so edits there trigger a Fast Refresh. Deliberately NOT the
// whole workspaceRoot: that also pulls in apps/web and anything else sitting
// at the repo root — including, at least once, a `.qa-build/` directory (a
// separate full build checkout, its own node_modules + Android build output)
// that alone added tens of thousands of extra watched directories and
// exhausted the OS inotify watch limit (ENOSPC crashing the watcher on
// react-native-screens' build/intermediates tree). Scoping to packages/
// avoids depending on whatever else happens to be sitting at the repo root.
config.watchFolders = [path.resolve(workspaceRoot, 'packages')];

// #2 — let Metro resolve modules hoisted to the workspace root as well as
// this app's own node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// #3 — stop Metro walking up from an arbitrary file to find the "nearest"
// node_modules (which breaks package hoisting assumptions in workspaces).
config.resolver.disableHierarchicalLookup = true;

// #4 — Expo's default blockList only excludes *this app's own*
// android/app/build. Watching the whole workspace (#1) means Metro also
// crawls every third-party RN package's own Gradle output under
// node_modules/<pkg>/android/build (confirmed: crashed the watcher with
// ENOSPC on react-native-screens' build/intermediates tree) — exclude that
// pattern everywhere, not just at the app root.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList]),
  /android[\\/](build|\.gradle)[\\/]/,
  /ios[\\/]Pods[\\/]/,
];

module.exports = config;
