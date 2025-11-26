// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Set the project root explicitly
config.projectRoot = projectRoot;

// 3. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 4. Enable symlinks for pnpm workspace packages
config.resolver.unstable_enableSymlinks = true;

// 5. Custom resolver to handle workspace root entry point
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix workspace root entry point resolution
  // When Metro tries to resolve ./index from workspace root, redirect to mobile app
  if (moduleName === './index' &&
      (context.originModulePath.endsWith('mandaact/.') ||
       context.originModulePath.endsWith('mandaact'))) {
    return {
      filePath: path.resolve(projectRoot, 'index.ts'),
      type: 'sourceFile',
    };
  }

  // Default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// 6. Apply NativeWind CSS processing
module.exports = withNativeWind(config, { input: './global.css' });
