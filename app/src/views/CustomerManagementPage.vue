<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button, CellGroup, Field, Picker, Popup } from 'vant'
import PageHeader from '../components/PageHeader.vue'
import { depositStatusOptions } from '../constants/options'
import { useAppStore } from '../stores/app'

const router = useRouter()
const store = useAppStore()

const keyword = ref('')
const editingId = ref('')
const showTypePicker = ref(false)
const showDepositPicker = ref(false)

const editForm = reactive({
  name: '',
  phone: '',
  type: '',
  location: '',
  style: '',
  hobby: '',
  specialNeed: '',
  depositStatus: 'unpaid',
})

const customerTypeColumns = computed(() =>
  store.customerTypes.map((item) => ({ text: item.name, value: item.code })),
)
const depositStatusColumns = depositStatusOptions.map(([value, text]) => ({ text, value }))

const customerTypeLabel = computed(
  () => (editForm.type ? store.getCustomerTypeName(editForm.type) : '请选择客户类型'),
)
const depositStatusLabel = computed(
  () => depositStatusOptions.find(([value]) => value === editForm.depositStatus)?.[1] ?? '请选择定金状态',
)

const list = computed(() => {
  const longTermCustomers = store.customers.filter((item) => item.isLongTerm !== false)
  const key = keyword.value.trim()
  if (!key) {
    return longTermCustomers
  }
  return longTermCustomers.filter((item) =>
    [item.name, item.phone, store.getCustomerTypeName(item.type)].some((field) => field.includes(key)),
  )
})

const openEdit = (id: string) => {
  const current = store.getCustomerById(id)
  if (!current) {
    return
  }
  editingId.value = id
  Object.assign(editForm, {
    name: current.name,
    phone: current.phone,
    type: current.type,
    location: current.location,
    style: current.style,
    hobby: current.hobby,
    specialNeed: current.specialNeed,
    depositStatus: current.depositStatus,
  })
}

const saveEdit = async () => {
  if (!editingId.value) {
    return
  }
  await store.updateCustomer(editingId.value, {
    ...editForm,
    type: editForm.type,
    depositStatus: editForm.depositStatus as 'unpaid' | 'paid' | 'full',
  })
  editingId.value = ''
}

const remove = async (id: string) => {
  await store.deleteCustomer(id)
  if (editingId.value === id) {
    editingId.value = ''
  }
}
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="客户管理" back right-text="新增" @back="router.back()" @right="router.push({ name: 'customer-new' })" />

    <article class="card mb-3 p-3 text-xs text-slate-600 soft-yellow">
      <p><i class="fa-solid fa-circle-info mr-1 text-amber-500" />这里仅展示长期客户，临时客户仅用于排单不进入客户管理列表。</p>
    </article>

    <Field v-model="keyword" class="mb-3 rounded-xl" clearable placeholder="搜索姓名 / 电话 / 客户类型" />

    <div class="space-y-2">
      <article v-for="item in list" :key="item.id" class="card p-3" :class="editingId === item.id ? 'soft-blue' : 'soft-pink'">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="font-extrabold">{{ item.name }} <span class="chip ml-1">{{ store.getCustomerTypeName(item.type) }}</span></p>
            <p class="mt-1 text-xs text-slate-500">{{ item.phone }} · {{ item.location || '未设置拍摄地点' }}</p>
          </div>
          <div class="flex gap-1">
            <button class="chip" type="button" @click="openEdit(item.id)">编辑</button>
            <button class="chip border-yellow-200 text-amber-700" type="button" @click="remove(item.id)">删除</button>
          </div>
        </div>

        <div v-if="editingId === item.id" class="mt-2 space-y-2 rounded-xl border border-blue-100 bg-white p-2">
          <CellGroup inset>
            <Field v-model="editForm.name" label="姓名" placeholder="请输入姓名" />
            <Field v-model="editForm.phone" label="电话" placeholder="请输入电话" />
            <Field
              :model-value="customerTypeLabel"
              label="客户类型"
              readonly
              is-link
              @click="showTypePicker = true"
            />
            <Field v-model="editForm.location" label="拍摄地点" placeholder="请输入拍摄地点" />
            <Field v-model="editForm.style" label="拍摄风格" placeholder="请输入拍摄风格" />
            <Field v-model="editForm.hobby" label="客户爱好" placeholder="请输入客户爱好" />
            <Field v-model="editForm.specialNeed" label="特殊需求" placeholder="请输入特殊需求" />
            <Field
              :model-value="depositStatusLabel"
              label="定金状态"
              readonly
              is-link
              @click="showDepositPicker = true"
            />
          </CellGroup>
          <div class="grid grid-cols-2 gap-2">
            <Button block round type="primary" @click="saveEdit">保存</Button>
            <Button block round plain type="primary" @click="editingId = ''">取消</Button>
          </div>
        </div>
      </article>
    </div>

    <Popup v-model:show="showTypePicker" position="bottom" round>
      <Picker
        :columns="customerTypeColumns"
        @cancel="showTypePicker = false"
        @confirm="({ selectedOptions }: any) => { editForm.type = selectedOptions[0]?.value || editForm.type; showTypePicker = false }"
      />
    </Popup>

    <Popup v-model:show="showDepositPicker" position="bottom" round>
      <Picker
        :columns="depositStatusColumns"
        @cancel="showDepositPicker = false"
        @confirm="({ selectedOptions }: any) => { editForm.depositStatus = selectedOptions[0]?.value || editForm.depositStatus; showDepositPicker = false }"
      />
    </Popup>
  </section>
</template>
