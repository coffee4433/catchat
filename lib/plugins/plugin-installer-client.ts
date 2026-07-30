export type PluginInstallProgress = {
  pluginId: string
  percent: number
}

export type PluginInstallerAPI = {
  install: (payload: {
    pluginId: string
    version: string
    downloadUrl: string
  }) => Promise<{ ok: boolean; pluginId: string; version: string; installDir: string }>
  onDownloadProgress: (callback: (progress: PluginInstallProgress) => void) => () => void
  getInstallPath: (pluginId: string) => Promise<string | null>
}

export function getPluginInstaller(): PluginInstallerAPI | null {
  if (typeof window === 'undefined') return null
  return (window as any).pluginInstaller ?? null
}
