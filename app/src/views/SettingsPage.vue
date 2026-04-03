<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Cell, CellGroup, Popup, Radio, RadioGroup, Switch } from 'vant'
import PageHeader from '../components/PageHeader.vue'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store = useAppStore()
const feedback = ref('')
const showThemePicker = ref(false)

const has1d = computed(() => store.defaultReminders.includes('1d'))
const has1h = computed(() => store.defaultReminders.includes('1h'))

const themeLabel = computed(() => {
  if (store.theme === 'blue') return '浅蓝'
  if (store.theme === 'yellow') return '鹅黄'
  return '浅粉'
})

const toggleReminder = async (type: '1d' | '1h') => {
  try {
    const set = new Set(store.defaultReminders)
    if (set.has(type)) {
      set.delete(type)
    } else {
      set.add(type)
    }
    await store.updateSettings({ defaultReminders: [...set] })
    feedback.value = '提醒设置已更新'
  } catch (error) {
    feedback.value = (error as Error).message || '提醒设置失败'
  }
}

const toggleBackup = async () => {
  try {
    await store.updateSettings({ backupEnabled: !store.backupEnabled })
    feedback.value = '备份设置已更新'
  } catch (error) {
    feedback.value = (error as Error).message || '备份设置失败'
  }
}

const applyTheme = async (theme: 'pink' | 'blue' | 'yellow') => {
  try {
    await store.setTheme(theme)
    feedback.value = '主题已保存'
    showThemePicker.value = false
  } catch (error) {
    feedback.value = (error as Error).message || '主题保存失败'
  }
}
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="个人设置" back @back="router.back()" />

    <article class="card mb-3 p-3 soft-blue">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-palette mr-1 text-blue-500" />卡通主题</p>
      <CellGroup inset>
        <Cell title="当前主题" :value="themeLabel" is-link @click="showThemePicker = true" />
      </CellGroup>
    </article>

    <article class="card mb-3 p-3 soft-yellow">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-regular fa-bell mr-1 text-amber-500" />默认提醒</p>
      <CellGroup inset>
        <Cell title="拍摄前 1 天提醒" center>
          <template #right-icon>
            <Switch :model-value="has1d" size="20" @update:model-value="toggleReminder('1d')" />
          </template>
        </Cell>
        <Cell title="拍摄前 1 小时提醒" center>
          <template #right-icon>
            <Switch :model-value="has1h" size="20" @update:model-value="toggleReminder('1h')" />
          </template>
        </Cell>
      </CellGroup>
    </article>

    <article class="card mb-3 p-3">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-cloud-arrow-up mr-1 text-rose-500" />数据与引导</p>
      <CellGroup inset>
        <Cell title="每日自动备份" center>
          <template #right-icon>
            <Switch :model-value="store.backupEnabled" size="20" @update:model-value="toggleBackup" />
          </template>
        </Cell>
      </CellGroup>
      <Button class="mt-3" block round plain type="primary">重新查看新手引导</Button>
    </article>

    <article class="card mb-3 p-3 soft-pink">
      <p class="mb-2 text-sm font-extrabold"><i class="fa-solid fa-ticket mr-1 text-rose-500" />注册邀请码</p>
      <CellGroup inset>
        <Cell
          title="邀请码管理"
          value="查看与编辑"
          is-link
          @click="router.push({ name: 'invite-codes' })"
        />
      </CellGroup>
    </article>

    <p v-if="feedback" class="text-xs text-blue-500">{{ feedback }}</p>

    <Popup v-model:show="showThemePicker" position="bottom" round>
      <div class="p-4">
        <p class="mb-3 text-sm font-bold">选择主题</p>
        <RadioGroup :model-value="store.theme" class="space-y-2">
          <Cell title="浅粉" clickable center @click="applyTheme('pink')">
            <template #right-icon>
              <Radio name="pink" />
            </template>
          </Cell>
          <Cell title="浅蓝" clickable center @click="applyTheme('blue')">
            <template #right-icon>
              <Radio name="blue" />
            </template>
          </Cell>
          <Cell title="鹅黄" clickable center @click="applyTheme('yellow')">
            <template #right-icon>
              <Radio name="yellow" />
            </template>
          </Cell>
        </RadioGroup>
      </div>
    </Popup>
  </section>
</template>
