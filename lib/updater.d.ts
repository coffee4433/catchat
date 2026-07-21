export interface UpdateInfo {
  version: string
  files: Array<{ url: string; size: number; sha512?: string }>
  path?: string
  releaseDate?: string
  releaseName?: string
  releaseNotes?: string
}

export interface DownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

export interface UpdaterAPI {
  onAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void
  onDownloaded: (callback: (info: UpdateInfo) => void) => () => void
  onError: (callback: (error: string) => void) => () => void
  checkForUpdates: () => Promise<UpdateInfo | null>
  downloadUpdate: () => Promise<void>
  quitAndInstall: () => Promise<void>
}

declare global {
  interface Window {
    updater?: UpdaterAPI
    commandRunner?: unknown
  }
}

export {}
