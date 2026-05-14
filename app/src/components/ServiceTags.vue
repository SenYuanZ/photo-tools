<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAppStore } from '../stores/app'

const props = defineProps<{
  roleCodes: string[]
}>()

const store = useAppStore()
const expanded = ref(false)
const isNarrow = ref(false)

const updateViewportFlag = () => {
  isNarrow.value = window.innerWidth < 380
}

onMounted(() => {
  updateViewportFlag()
  window.addEventListener('resize', updateViewportFlag)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportFlag)
})

const normalizedRoleCodes = computed(() => [...new Set(props.roleCodes.filter(Boolean))])

const maxVisible = computed(() => (isNarrow.value ? 2 : 3))
const canCollapse = computed(() => normalizedRoleCodes.value.length > maxVisible.value)
const visibleRoleCodes = computed(() => {
  if (expanded.value || !canCollapse.value) {
    return normalizedRoleCodes.value
  }
  return normalizedRoleCodes.value.slice(0, maxVisible.value)
})
const collapsedCount = computed(() => normalizedRoleCodes.value.length - visibleRoleCodes.value.length)

const roleClass = (code: string) => {
  if (code === 'makeup_artist') {
    return 'border-rose-200 bg-rose-50 text-rose-500'
  }
  if (code === 'photographer') {
    return 'border-blue-200 bg-blue-50 text-blue-500'
  }
  return 'border-slate-200 bg-slate-50 text-slate-600'
}

const roleIcon = (code: string) => {
  if (code === 'makeup_artist') {
    return 'fa-solid fa-wand-magic-sparkles'
  }
  if (code === 'photographer') {
    return 'fa-solid fa-camera'
  }
  return 'fa-solid fa-tag'
}

const roleLabel = (code: string) => store.getRoleName(code)
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      v-for="code in visibleRoleCodes"
      :key="code"
      class="inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none"
      :class="roleClass(code)"
      :title="roleLabel(code)"
    >
      <i :class="roleIcon(code)" />
      <span class="truncate">{{ roleLabel(code) }}</span>
    </span>

    <button
      v-if="canCollapse"
      type="button"
      class="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500"
      @click.stop="expanded = !expanded"
    >
      {{ expanded ? '收起' : `+${collapsedCount}更多` }}
    </button>
  </div>
</template>
