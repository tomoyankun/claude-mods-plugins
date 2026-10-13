export type Segment = { text: string; percent: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-status': { segments: Segment[]; isTeammate: boolean }
  }
}
