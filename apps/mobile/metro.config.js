const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')
const config = getDefaultConfig(projectRoot)

config.watchFolders = [path.join(workspaceRoot, 'packages/core')]
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@yinqi/core': path.join(workspaceRoot, 'packages/core')
}

module.exports = config
