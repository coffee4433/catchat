import type { CatChatPlugin } from './plugin-types'

// Registry array for all dynamically installed and registered plugins
const registeredPlugins: CatChatPlugin[] = []

export function registerPlugin(plugin: CatChatPlugin) {
  const existingIndex = registeredPlugins.findIndex((p) => p.metadata.id === plugin.metadata.id)
  if (existingIndex >= 0) {
    registeredPlugins[existingIndex] = plugin
  } else {
    registeredPlugins.push(plugin)
  }
}

export function unregisterPlugin(id: string) {
  const existingIndex = registeredPlugins.findIndex((p) => p.metadata.id === id)
  if (existingIndex >= 0) {
    registeredPlugins.splice(existingIndex, 1)
  }
}

export function getRegisteredPlugins(): CatChatPlugin[] {
  return registeredPlugins
}

export function getPluginById(id: string): CatChatPlugin | undefined {
  return registeredPlugins.find((p) => p.metadata.id === id)
}
