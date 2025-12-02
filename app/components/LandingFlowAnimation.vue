<script setup lang="ts">
type FlowNode = {
  name: string
  icon: string
  x: number
  y: number
  badgeClass: string
}

const viewBox = {
  width: 1100,
  height: 360
} as const

const center = {
  x: viewBox.width / 2,
  y: viewBox.height / 2
}

const socialNodes: FlowNode[] = [
  {
    name: 'Instagram',
    icon: 'i-simple-icons-instagram',
    x: 115,
    y: 82,
    badgeClass: 'bg-neutral-900 text-white'
  },
  {
    name: 'TikTok',
    icon: 'i-simple-icons-tiktok',
    x: 105,
    y: 188,
    badgeClass: 'bg-neutral-900 text-white'
  },
  {
    name: 'Snapchat',
    icon: 'i-simple-icons-snapchat',
    x: 128,
    y: 296,
    badgeClass: 'bg-neutral-900 text-white'
  }
]

const browserNodes: FlowNode[] = [
  {
    name: 'Safari',
    icon: 'i-logos-safari',
    x: 1000,
    y: 140,
    badgeClass: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 shadow-[0_10px_40px_-20px_rgba(14,165,233,0.35)]'
  },
  {
    name: 'Chrome',
    icon: 'i-logos-chrome',
    x: 1000,
    y: 240,
    badgeClass: 'bg-white text-emerald-600 ring-1 ring-neutral-200 shadow-[0_10px_40px_-20px_rgba(34,197,94,0.35)]'
  }
]

const createCurve = (from: { x: number; y: number }, to: { x: number; y: number }, lift: number) => {
  const midX = (from.x + to.x) / 2
  const controlA = { x: midX - 120, y: from.y + lift }
  const controlB = { x: midX + 120, y: to.y - lift }
  return `M ${from.x} ${from.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${to.x} ${to.y}`
}

const leftCurves = socialNodes.map((node, index) => createCurve(
  { x: node.x + 44, y: node.y },
  { x: center.x - 18, y: center.y + (index - 1) * 12 },
  (index - 1) * 22
))

const rightCurves = browserNodes.map((node, index) => createCurve(
  { x: center.x + 18, y: center.y + (index - 1) * 10 },
  { x: node.x - 44, y: node.y },
  (index - 1) * -20
))

const positionStyle = (node: FlowNode) => ({
  left: `${(node.x / viewBox.width) * 100}%`,
  top: `${(node.y / viewBox.height) * 100}%`
})

type Point = {
  x: number
  y: number
}

const createMobileCurve = (from: Point, to: Point, offset: number) => {
  const midX = (from.x + to.x) / 2 + offset
  const controlA = { x: midX, y: from.y }
  const controlB = { x: midX, y: to.y }
  return `M ${from.x} ${from.y} C ${controlA.x} ${controlA.y}, ${controlB.x} ${controlB.y}, ${to.x} ${to.y}`
}

const mobileFlowArea = ref<HTMLElement | null>(null)
const mobileCenterRef = ref<HTMLElement | null>(null)
const mobileSocialRefs = ref<(HTMLElement | null)[]>([])
const mobileBrowserRefs = ref<(HTMLElement | null)[]>([])
const mobileCurves = ref<{ id: string; d: string }[]>([])
const mobileViewBox = ref({ width: 360, height: 520 })

const setSocialRef = (index: number) => (el: HTMLElement | null) => {
  mobileSocialRefs.value[index] = el
}

const setBrowserRef = (index: number) => (el: HTMLElement | null) => {
  mobileBrowserRefs.value[index] = el
}

const updateMobileCurves = () => {
  if (!mobileFlowArea.value || !mobileCenterRef.value) {
    return
  }

  const areaRect = mobileFlowArea.value.getBoundingClientRect()

  if (!areaRect.width || !areaRect.height) {
    return
  }

  mobileViewBox.value = {
    width: areaRect.width,
    height: areaRect.height
  }

  const centerRect = mobileCenterRef.value.getBoundingClientRect()
  const centerPoint = {
    x: centerRect.left - areaRect.left + centerRect.width / 2,
    y: centerRect.top - areaRect.top + centerRect.height / 2
  }

  const curves: { id: string; d: string }[] = []

  const addCurves = (
    nodes: (HTMLElement | null)[],
    prefix: 'social' | 'browser',
    direction: 'to-center' | 'from-center'
  ) => {
    const validNodes = nodes
      .map((node, index) => ({ node, index }))
      .filter(({ node }) => node) as { node: HTMLElement; index: number }[]

    validNodes.forEach(({ node, index }) => {
      const rect = node.getBoundingClientRect()
      const nodePoint = {
        x: rect.left - areaRect.left + rect.width / 2,
        y: rect.top - areaRect.top + rect.height / 2
      }

      const baseOffset = nodePoint.x < centerPoint.x ? -26 : 26
      const spreadOffset = (index - (validNodes.length - 1) / 2) * 9
      const offset = baseOffset + spreadOffset
      const from = direction === 'to-center' ? nodePoint : centerPoint
      const to = direction === 'to-center' ? centerPoint : nodePoint

      curves.push({
        id: `mobile-${prefix}-${index}`,
        d: createMobileCurve(from, to, offset)
      })
    })
  }

  addCurves(mobileSocialRefs.value, 'social', 'to-center')
  addCurves(mobileBrowserRefs.value, 'browser', 'from-center')

  mobileCurves.value = curves
}

let stopResizeObserver: (() => void) | undefined
let stopWindowResize: (() => void) | undefined

onMounted(() => {
  nextTick(updateMobileCurves)

  const observer = useResizeObserver(mobileFlowArea, () => updateMobileCurves())
  stopResizeObserver = observer.stop

  stopWindowResize = useEventListener(window, 'resize', () => updateMobileCurves())
})

onBeforeUnmount(() => {
  stopResizeObserver?.()
  stopWindowResize?.()
})
</script>

<template>
  <div class="relative mt-10">
    <div class="hidden md:block">
      <div class="relative overflow-hidden rounded-3xl border border-default/70 bg-gradient-to-b from-white/80 via-white/60 to-white/40 p-4 dark:from-neutral-950/80 dark:via-neutral-950/60 dark:to-neutral-900/50">
        <div class="absolute inset-0 pointer-events-none opacity-90">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(255,214,170,0.4),transparent_35%),radial-gradient(circle_at_75%_60%,rgba(255,138,76,0.35),transparent_32%)]" />
        </div>

        <div class="relative aspect-[11/4] min-h-[260px]">
          <svg
            class="absolute inset-0 h-full w-full"
            viewBox="0 0 1100 360"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="flowStroke"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stop-color="var(--ui-color-primary-500)"
                  stop-opacity="0.25"
                />
                <stop
                  offset="45%"
                  stop-color="var(--ui-color-primary-500)"
                  stop-opacity="0.6"
                />
                <stop
                  offset="100%"
                  stop-color="var(--ui-color-primary-400)"
                  stop-opacity="0.9"
                />
              </linearGradient>
            </defs>

            <g class="flow-line flow-line-left">
              <path
                v-for="(curve, index) in leftCurves"
                :key="`left-${index}`"
                :d="curve"
              />
            </g>

            <g class="flow-line flow-line-left">
              <path
                v-for="(curve, index) in rightCurves"
                :key="`right-${index}`"
                :d="curve"
              />
            </g>
          </svg>

          <div
            v-for="node in socialNodes"
            :key="node.name"
            class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-semibold text-highlighted shadow-[0_15px_40px_-28px_rgba(0,0,0,0.65)] backdrop-blur dark:border-white/10 dark:bg-neutral-900/85"
            :style="positionStyle(node)"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full text-2xl ring-offset-1"
              :class="node.badgeClass"
            >
              <UIcon
                :name="node.icon"
                class="h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <span class="hidden text-sm md:inline">{{ node.name }}</span>
          </div>

          <div
            v-for="node in browserNodes"
            :key="node.name"
            class="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-semibold text-highlighted shadow-[0_15px_40px_-28px_rgba(0,0,0,0.65)] backdrop-blur dark:border-white/10 dark:bg-neutral-900/85"
            :style="positionStyle(node)"
          >
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full text-2xl ring-offset-1"
              :class="node.badgeClass"
            >
              <UIcon
                :name="node.icon"
                class="h-6 w-6"
                aria-hidden="true"
              />
            </div>
            <span class="text-sm hidden md:inline">{{ node.name }}</span>
          </div>

          <div
            class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 text-center"
          >
            <div class="relative h-28 w-28">
              <div class="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,125,50,0.45)_0,rgba(255,125,50,0)_55%)] blur-lg" />
              <div class="absolute inset-0 animate-ping rounded-full bg-orange-400/30" />
              <div class="relative flex h-full w-full items-center justify-center rounded-full border border-orange-200/60 bg-white/95 shadow-[0_20px_70px_-45px_rgba(0,0,0,0.9)] backdrop-blur dark:border-orange-200/30 dark:bg-neutral-900/95">
                <AppLogo height="h-11" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="md:hidden">
      <div class="relative overflow-hidden rounded-3xl border border-default/70 bg-gradient-to-b from-white/80 via-white/60 to-white/40 p-4 backdrop-blur dark:from-neutral-950/80 dark:via-neutral-950/60 dark:to-neutral-900/50">
        <div class="absolute inset-0 pointer-events-none opacity-90">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,214,170,0.4),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(255,138,76,0.32),transparent_32%)]" />
        </div>

        <div
          ref="mobileFlowArea"
          class="relative flex flex-col items-center gap-7 px-2 py-8"
        >
          <svg
            v-if="mobileCurves.length"
            class="pointer-events-none absolute inset-0 z-0 h-full w-full"
            :viewBox="`0 0 ${mobileViewBox.width} ${mobileViewBox.height}`"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id="mobileFlowStroke"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop
                  offset="0%"
                  stop-color="var(--ui-color-primary-500)"
                  stop-opacity="0.2"
                />
                <stop
                  offset="50%"
                  stop-color="var(--ui-color-primary-500)"
                  stop-opacity="0.6"
                />
                <stop
                  offset="100%"
                  stop-color="var(--ui-color-primary-400)"
                  stop-opacity="0.85"
                />
              </linearGradient>
            </defs>

            <g class="mobile-flow-line">
              <path
                v-for="curve in mobileCurves"
                :key="curve.id"
                :d="curve.d"
              />
            </g>
          </svg>

          <div class="absolute left-1/2 top-20 bottom-20 z-0 w-[3px] md:block hidden">
            <div class="absolute inset-0 rounded-full bg-gradient-to-b from-orange-400/65 via-orange-300/55 to-orange-200/40" />
            <div class="absolute inset-[-6px] rounded-full bg-orange-300/15 blur-xl" />
            <div class="vertical-dots absolute inset-0" />
          </div>

          <div class="z-[1] flex flex-wrap items-center justify-center gap-4 pt-2">
            <div
              v-for="(node, index) in socialNodes"
              :key="`mobile-social-${node.name}`"
              :ref="setSocialRef(index)"
              class="relative flex min-w-[120px] items-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-semibold text-highlighted shadow-[0_12px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur dark:border-white/10 dark:bg-neutral-900/85"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-full text-xl ring-offset-1"
                :class="node.badgeClass"
              >
                <UIcon
                  :name="node.icon"
                  class="h-6 w-6"
                  aria-hidden="true"
                />
              </div>
              <span class="text-sm">{{ node.name }}</span>
            </div>
          </div>

          <div
            ref="mobileCenterRef"
            class="z-[1] flex flex-col items-center gap-3 text-center"
          >
            <div class="relative h-24 w-24">
              <div class="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,125,50,0.35)_0,rgba(255,125,50,0)_55%)] blur-lg" />
              <div class="absolute inset-0 animate-ping rounded-full bg-orange-400/25" />
              <div class="relative flex h-full w-full items-center justify-center rounded-full border border-orange-200/60 bg-white/95 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.9)] backdrop-blur dark:border-orange-200/30 dark:bg-neutral-900/95">
                <AppLogo height="h-10" />
              </div>
            </div>
          </div>

          <div class="z-[1] flex flex-wrap items-center justify-center gap-4 pb-2">
            <div
              v-for="(node, index) in browserNodes"
              :key="`mobile-browser-${node.name}`"
              :ref="setBrowserRef(index)"
              class="relative flex min-w-[140px] items-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-3 py-2 text-sm font-semibold text-highlighted shadow-[0_12px_30px_-26px_rgba(0,0,0,0.65)] backdrop-blur dark:border-white/10 dark:bg-neutral-900/85"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-full text-xl ring-offset-1"
                :class="node.badgeClass"
              >
                <UIcon
                  :name="node.icon"
                  class="h-6 w-6"
                  aria-hidden="true"
                />
              </div>
              <span class="text-sm">{{ node.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-line path {
  stroke: url(#flowStroke);
  stroke-width: 3;
  stroke-dasharray: 10 16;
  stroke-linecap: round;
  filter: drop-shadow(0 0 12px rgba(255, 140, 72, 0.35));
}

.mobile-flow-line path {
  stroke: url(#mobileFlowStroke);
  stroke-width: 2.6;
  stroke-dasharray: 9 14;
  stroke-linecap: round;
  filter: drop-shadow(0 0 10px rgba(255, 140, 72, 0.28));
  animation: flowLeft 3.2s linear infinite;
}

.flow-line-left {
  animation: flowLeft 3.6s linear infinite;
}

.flow-line-right {
  animation: flowRight 3.2s linear infinite;
}

@keyframes flowLeft {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -240;
  }
}

@keyframes flowRight {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: 240;
  }
}

.vertical-dots {
  background-image: linear-gradient(
    to bottom,
    rgba(249, 115, 22, 0.95),
    rgba(249, 115, 22, 0.95) 50%,
    transparent 50%,
    transparent 100%
  );
  background-size: 4px 22px;
  background-repeat: repeat-y;
  animation: flowDown 2.8s linear infinite;
  filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.35));
}

@keyframes flowDown {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 0 22px;
  }
}
</style>
