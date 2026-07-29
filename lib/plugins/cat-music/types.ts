export type Track = {
  id: string // YouTube video ID (11 chars)
  title: string
  artist: string
  album?: string
  durationSeconds: number
  artworkUrl: string
  genre?: string
  year?: number
  source: 'youtube' | 'local'
}

export type PlaylistTrack = {
  id: string
  playlistId: string
  trackId: string
  position: number
  addedAt: string
  track?: Track
}

export type Playlist = {
  id: string
  userId?: string
  name: string
  description?: string
  coverUrl?: string | null
  isPublic?: boolean
  createdAt: string
  updatedAt: string
  tracks: Track[]
}

export type PlayHistoryEntry = {
  id: string
  userId?: string
  trackId: string
  track: Track
  playedAt: string
  msPlayed: number
  completed: boolean
  contextType?: string
}

export type DownloadStatus = 'queued' | 'processing' | 'ready' | 'failed'

export type DownloadJob = {
  id: string
  userId?: string
  trackId: string
  track: Track
  status: DownloadStatus
  progress: number
  format: 'mp3' | 'm4a'
  bitrateKbps: number
  fileSizeBytes?: number
  fileUrl?: string
  errorMessage?: string
  requestedAt: string
  completedAt?: string
}

export type CatMusicSettings = {
  audioQuality: 'normal' | 'high' | 'very_high'
  autoplay: boolean
  crossfadeSeconds: number
  defaultVolume: number
  explicitAllowed: boolean
  downloadBitrate: number
}

export type RepeatMode = 'off' | 'all' | 'one'

export type PlayerState = {
  queue: Track[]
  index: number
  isPlaying: boolean
  isBuffering: boolean
  position: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  context: { type: string; id?: string } | null
  error: string | null
}
