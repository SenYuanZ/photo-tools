<script setup lang="ts">
defineProps<{
  title: string
  back?: boolean
  rightText?: string
}>()

const emit = defineEmits<{
  back: []
  right: []
}>()
</script>

<template>
  <header class="mb-3 flex items-center justify-between">
    <button v-if="back" class="chip" type="button" @click="emit('back')">
      <i class="fa-solid fa-chevron-left" /> 返回
    </button>
    <span v-else class="w-[64px]" />

    <h1 class="title-font text-2xl text-rose-500">{{ title }}</h1>

    <button v-if="rightText" class="chip" type="button" @click="emit('right')">
      {{ rightText }}
    </button>
    <span v-else class="w-[64px]" />
  </header>
</template>
