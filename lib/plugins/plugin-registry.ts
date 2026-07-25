import type { CatChatPlugin } from './plugin-types'
import { catMusicPlugin } from './cat-music'

// Registry array for all built-in and dynamically registered plugins
const registeredPlugins: CatChatPlugin[] = [catMusicPlugin]

export function registerPlugin(plugin: CatChatPlugin) {
  const existingIndex = registeredPlugins.findIndex((p) => p.metadata.id === plugin.metadata.id)
  if (existingIndex >= 0) {
    registeredPlugins[existingIndex] = plugin
  } else {
    registeredPlugins.push(plugin)
  }
}

export function getRegisteredPlugins(): CatChatPlugin[] {
  return registeredPlugins
}

export function getPluginById(id: string): CatChatPlugin | undefined {
  return registeredPlugins.find((p) => p.metadata.id === id)
}
