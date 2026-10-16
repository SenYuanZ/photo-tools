<script setup lang="ts">
defineProps<{
  customerName: string
  phone: string
  customerType: string
  tags: string[]
  sourceLabel: string
  serviceType: string
  roleLabels: string[]
}>()

const emit = defineEmits<{ copyPhone: [] }>()
</script>

<template>
  <section class="customer-summary" aria-labelledby="detail-customer-name">
    <div class="customer-heading">
      <h2 id="detail-customer-name">{{ customerName }}</h2>
      <a v-if="phone" class="contact-button" :href="`tel:${phone}`">
        <i class="fa-solid fa-phone" aria-hidden="true" />联系客户
      </a>
    </div>
    <div class="customer-tags" aria-label="客户标签">
      <span class="detail-tag detail-tag--accent">{{ sourceLabel }}</span>
      <span v-for="tag in tags" :key="tag" class="detail-tag">{{ tag }}</span>
    </div>
    <dl class="customer-fields">
      <div v-if="phone" class="customer-field">
        <dt><span class="detail-tag">联系电话</span></dt>
        <dd>
          <button
            type="button"
            class="copy-phone"
            :aria-label="`复制联系电话 ${phone}`"
            @click="emit('copyPhone')"
          >
            {{ phone }}<i class="fa-regular fa-copy" aria-hidden="true" />
          </button>
        </dd>
      </div>
      <div class="customer-field">
        <dt><span class="detail-tag">拍摄服务</span></dt>
        <dd class="service-tags">
          <span v-if="customerType" class="detail-tag detail-tag--accent">{{ customerType }}</span>
          <span class="detail-tag">{{ serviceType }}</span>
          <span v-for="role in roleLabels" :key="role" class="detail-tag">{{ role }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.customer-summary {
  padding: 22px 0;
}
.customer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.customer-heading h2 {
  min-width: 0;
  margin: 0;
  color: var(--ink);
  font-size: 23px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.contact-button {
  display: inline-flex;
  min-height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  padding: 0 12px;
  background: var(--theme-accent-bg);
  color: var(--detail-accent-text);
  font-size: 14px;
}
.contact-button i {
  font-size: 15px;
}
.customer-tags,
.service-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.customer-tags {
  margin: -2px 0 20px;
}
.detail-tag {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  border-radius: 999px;
  padding: 3px 10px;
  background: var(--theme-accent-bg);
  color: var(--theme-muted);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.detail-tag--accent {
  background: var(--theme-accent-soft);
  color: var(--detail-accent-text);
}
.customer-fields {
  margin: 0;
}
.customer-field {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
}
.customer-field + .customer-field {
  margin-top: 14px;
}
.customer-field dt .detail-tag {
  padding: 2px 6px;
  white-space: nowrap;
}
.customer-field dd {
  min-width: 0;
  margin: 0;
}
.copy-phone {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  margin: -10px 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: var(--ink);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  text-align: left;
  overflow-wrap: anywhere;
}
.copy-phone i {
  color: var(--theme-muted);
  font-size: 14px;
}
@media (max-width: 350px) {
  .customer-field {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 12px;
  }
  .contact-button {
    gap: 5px;
    padding: 0 9px;
    font-size: 13px;
  }
}
</style>
