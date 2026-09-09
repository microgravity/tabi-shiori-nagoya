import { routeAchievementLevel, routeEffortProgress, type RouteAchievementLevel } from './progress'
import type { PracticeProgress, RailwayOperator, Route, Station } from './types'

export const TOKYO_METRO_UNLOCK_MILESTONE_ID = 'tokyo-metro-unlock-v1'
export const UNLOCK_SYSTEM_VERSION = 2
export const TOKYO_METRO_STARTER_ROUTE_IDS = ['metro-hanzomon', 'metro-ginza'] as const
export const TOKYO_METRO_CHOICE_ROUTE_IDS = [
  'metro-marunouchi',
  'metro-hibiya',
  'metro-tozai',
  'metro-chiyoda',
  'metro-yurakucho',
  'metro-namboku',
  'metro-fukutoshin',
] as const
export const ROUTE_CHECKPOINT_RATIOS = [0.25, 0.5, 0.75, 1] as const

export type RouteCheckpointRatio = typeof ROUTE_CHECKPOINT_RATIOS[number]

export type UnlockCondition =
  | { kind: 'route-achievement'; routeId: string; level: Exclude<RouteAchievementLevel, 'none'> }
  | { kind: 'route-effort'; routeId: string; ratio: RouteCheckpointRatio }
  | { kind: 'all'; conditions: UnlockCondition[] }
  | { kind: 'any'; conditions: UnlockCondition[] }

export interface UnlockMilestone {
  id: string
  title: string
  description: string
  condition: UnlockCondition
}

export interface UnlockContext {
  routes: readonly Route[]
  stationById: ReadonlyMap<string, Station>
  progress: Record<string, PracticeProgress>
}

export interface UnlockProgress {
  completed: number
  total: number
  earned: boolean
}

export interface RouteCheckpointMilestone extends UnlockMilestone {
  routeId: string
  ratio: RouteCheckpointRatio
  stampNumber: number
}

export interface MetroUnlockStatus {
  earnedStamps: number
  unlockedChoices: number
  availableChoices: number
  nextStampTarget?: number
}

const prerequisiteRouteIds = [
  'toyoko', 'meguro', 'shinyokohama', 'denentoshi', 'oimachi', 'ikegami', 'tamagawa', 'setagaya', 'kodomonokuni',
  'sotetsu-main', 'sotetsu-izumino', 'sotetsu-shinyokohama',
]

const tokyoMetroRouteIds = [...TOKYO_METRO_STARTER_ROUTE_IDS, ...TOKYO_METRO_CHOICE_ROUTE_IDS]
const checkpointRouteIds = [...prerequisiteRouteIds, ...tokyoMetroRouteIds]

export function metroRouteUnlockMilestoneId(routeId: string): string {
  return `tokyo-metro-route-${routeId}-unlock-v1`
}

function routeCheckpointMilestoneId(routeId: string, ratio: RouteCheckpointRatio): string {
  return `route-checkpoint-${routeId}-${Math.round(ratio * 100)}-v1`
}

export const routeCheckpointMilestones: RouteCheckpointMilestone[] = checkpointRouteIds.flatMap((routeId) => (
  ROUTE_CHECKPOINT_RATIOS.map((ratio, index) => ({
    id: routeCheckpointMilestoneId(routeId, ratio),
    title: `${Math.round(ratio * 100)}% くかんスタンプ`,
    description: 'れんしゅうした もじの すすみぐあいで もらえるスタンプ',
    routeId,
    ratio,
    stampNumber: index + 1,
    condition: { kind: 'route-effort' as const, routeId, ratio },
  }))
))
export const metroRouteCheckpointMilestones = routeCheckpointMilestones.filter((milestone) => (
  tokyoMetroRouteIds.includes(milestone.routeId as typeof tokyoMetroRouteIds[number])
))

const tokyoMetroUnlockMilestone: UnlockMilestone = {
  id: TOKYO_METRO_UNLOCK_MILESTONE_ID,
  title: 'とうきょうメトロ',
  description: 'とうきゅう・そうてつを ぜんぶ クリア',
  condition: {
    kind: 'all',
    conditions: prerequisiteRouteIds.map((routeId) => ({ kind: 'route-achievement', routeId, level: 'complete' })),
  },
}

export const unlockMilestones: UnlockMilestone[] = [tokyoMetroUnlockMilestone, ...routeCheckpointMilestones]

export const unlockMilestoneById = new Map(unlockMilestones.map((milestone) => [milestone.id, milestone]))
export const routeCheckpointMilestoneById = new Map(routeCheckpointMilestones.map((milestone) => [milestone.id, milestone]))

const achievementRank: Record<RouteAchievementLevel, number> = { none: 0, complete: 1, master: 2 }

export function isUnlockConditionMet(condition: UnlockCondition, context: UnlockContext): boolean {
  if (condition.kind === 'all') return condition.conditions.every((item) => isUnlockConditionMet(item, context))
  if (condition.kind === 'any') return condition.conditions.some((item) => isUnlockConditionMet(item, context))
  const route = context.routes.find((item) => item.id === condition.routeId)
  if (!route) return false
  if (condition.kind === 'route-effort') {
    return routeEffortProgress(route.orderedStationIds, context.stationById, context.progress).ratio >= condition.ratio
  }
  const level = routeAchievementLevel(route.orderedStationIds, context.stationById, context.progress)
  return achievementRank[level] >= achievementRank[condition.level]
}

export function unlockProgress(milestone: UnlockMilestone, context: UnlockContext): UnlockProgress {
  const conditions = milestone.condition.kind === 'all' ? milestone.condition.conditions : [milestone.condition]
  const completed = conditions.filter((condition) => isUnlockConditionMet(condition, context)).length
  return { completed, total: conditions.length, earned: isUnlockConditionMet(milestone.condition, context) }
}

export function grantEarnedMilestones(currentIds: readonly string[], context: UnlockContext): string[] {
  const granted = new Set(currentIds)
  for (const milestone of unlockMilestones) {
    if (isUnlockConditionMet(milestone.condition, context)) granted.add(milestone.id)
  }
  return [...granted]
}

const metroRouteChoiceThresholds = TOKYO_METRO_CHOICE_ROUTE_IDS.map((_, index) => 2 + (index * 3))

export function metroUnlockStatus(unlockedMilestones: readonly string[]): MetroUnlockStatus {
  const earnedStamps = metroRouteCheckpointMilestones.filter((milestone) => unlockedMilestones.includes(milestone.id)).length
  const unlockedChoices = TOKYO_METRO_CHOICE_ROUTE_IDS.filter((routeId) => (
    unlockedMilestones.includes(metroRouteUnlockMilestoneId(routeId))
  )).length
  const earnedChoices = metroRouteChoiceThresholds.filter((threshold) => earnedStamps >= threshold).length
  return {
    earnedStamps,
    unlockedChoices,
    availableChoices: Math.max(0, earnedChoices - unlockedChoices),
    nextStampTarget: metroRouteChoiceThresholds[unlockedChoices],
  }
}

export function grantMetroRouteChoice(currentIds: readonly string[], routeId: string): string[] {
  if (!TOKYO_METRO_CHOICE_ROUTE_IDS.some((candidate) => candidate === routeId)) return [...currentIds]
  const milestoneId = metroRouteUnlockMilestoneId(routeId)
  if (currentIds.includes(milestoneId) || metroUnlockStatus(currentIds).availableChoices < 1) return [...currentIds]
  return [...new Set([...currentIds, milestoneId])]
}

export function migrateUnlockMilestones(currentIds: readonly string[], fromVersion: number): string[] {
  if (fromVersion >= UNLOCK_SYSTEM_VERSION || !currentIds.includes(TOKYO_METRO_UNLOCK_MILESTONE_ID)) {
    return [...currentIds]
  }
  return [...new Set([
    ...currentIds,
    ...TOKYO_METRO_CHOICE_ROUTE_IDS.map(metroRouteUnlockMilestoneId),
  ])]
}

export function isOperatorUnlocked(operator: RailwayOperator, unlockedMilestones: readonly string[]): boolean {
  return !operator.unlockMilestoneId || unlockedMilestones.includes(operator.unlockMilestoneId)
}

export function isRouteUnlocked(route: Route, operators: readonly RailwayOperator[], unlockedMilestones: readonly string[]): boolean {
  const operator = operators.find((item) => item.id === route.operatorId)
  return Boolean(
    operator
    && isOperatorUnlocked(operator, unlockedMilestones)
    && (!route.unlockMilestoneId || unlockedMilestones.includes(route.unlockMilestoneId)),
  )
}
