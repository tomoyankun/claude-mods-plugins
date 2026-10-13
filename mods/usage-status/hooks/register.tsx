import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Segment } from '../types'

const segmentsAtom = atom({ plugin: 'usage-status', key: 'segments' } as const, [] as Segment[])

// 別ペインのチームメイトは、チーム設定のtmuxPaneIdに自分のTMUX_PANEが載る。リードは載らない。
const teammateAtom = atom({ plugin: 'usage-status', key: 'isTeammate' } as const, false)

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d' }
const GAUGE_WIDTH = 10
export const CAUTION_PERCENT = 50
export const DANGER_PERCENT = 80

export type Level = 'ok' | 'caution' | 'danger'

const LEVEL_COLORS = { ok: 'success', caution: 'warning', danger: 'error' } as const

export const formatTokens = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}k` : `${n}`

export const gauge = (percent: number): string => {
  const filled = Math.min(GAUGE_WIDTH, Math.max(0, Math.round((percent / 100) * GAUGE_WIDTH)))

  return '█'.repeat(filled) + '░'.repeat(GAUGE_WIDTH - filled)
}

export const levelOf = (segment: Segment): Level =>
  segment.percent >= DANGER_PERCENT ? 'danger' : segment.percent >= CAUTION_PERCENT ? 'caution' : 'ok'

// サブエージェント・チームメイトのtranscriptを開いている間は、ゲージを出さない。
export const isHiddenView = (props: { hasSurvey: boolean; view: { agentId?: string } }): boolean =>
  props.hasSurvey || props.view.agentId !== undefined

type TeamConfig = { members?: { backendType?: string; tmuxPaneId?: string }[] }

export const isTeammatePane = (configs: TeamConfig[], pane: string | undefined): boolean =>
  pane !== undefined &&
  configs.some(c => c.members?.some(m => m.backendType === 'tmux' && m.tmuxPaneId === pane))

const readTeamConfigs = async ($: EngineInterface): Promise<TeamConfig[]> => {
  const home = await $.env.get('HOME')
  const dirs = await $.fs.list(`${home}/.claude/teams`)
  const configs: TeamConfig[] = []

  for (const d of dirs) {
    try {
      configs.push(JSON.parse(await $.fs.read(`${home}/.claude/teams/${d.name}/config.json`)))
    } catch {
      // 設定が読めないチームは判定に使わない。
    }
  }

  return configs
}

const pad = (n: number): string => String(n).padStart(2, '0')

// 5時間枠は当日中にリセットされるため時刻のみ、1週間枠は日付も示す。
export const formatReset = (kind: string, resetsAt: string | undefined): string => {
  const date = resetsAt === undefined ? undefined : new Date(resetsAt)

  if (date === undefined || Number.isNaN(date.getTime())) {
    return ''
  }

  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`

  return kind === 'five_hour' ? ` ↻ ${time}` : ` ↻ ${date.getMonth() + 1}/${date.getDate()} ${time}`
}

export const buildSegments = (
  context: SessionContextUsage,
  rateLimits: SessionRateLimit[],
): Segment[] => {
  const limits = rateLimits
    .filter(r => r.kind in LABELS)
    .map(r => ({
      text: `${LABELS[r.kind]} ${gauge(r.percentUsed)} ${r.percentUsed}%${formatReset(r.kind, r.resetsAt)}`,
      percent: r.percentUsed,
    }))
  // 最初の応答が返るまでtokensは無いので、0として空のゲージを出す。
  const used = context.tokens ?? 0
  const percent = context.percent ?? 0
  const tokens: Segment = {
    text: `context usage ${gauge(percent)} ${formatTokens(used)}/${formatTokens(context.window)} (${percent}%)`,
    percent,
  }

  return [...limits, tokens]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const pane = await $.env.get('TMUX_PANE')
    const detected = await readTeamConfigs($).then(c => isTeammatePane(c, pane)).catch(() => false)
    await update($, teammateAtom, () => detected)
    const usage = await $.session.usage()
    await update($, segmentsAtom, () => buildSegments(usage.context, usage.rateLimits))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, segmentsAtom, () => buildSegments(e.context, e.rateLimits))

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const segments = await read($, segmentsAtom)
    const isTeammate = await read($, teammateAtom)

    if (isTeammate || isHiddenView(e.props) || segments.length === 0) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text key="divider" dimColor>
          {'─'.repeat(e.props.bodyColumns)}
        </Text>
        <Box key="gauges">
          {segments.map((s, i) => (
            <Text key={`s${i}`} color={LEVEL_COLORS[levelOf(s)]}>
              {i > 0 ? ' | ' : ''}
              {s.text}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })
}
