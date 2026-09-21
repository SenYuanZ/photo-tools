<script setup lang="ts">
import { Button, Cell, CellGroup, Field, Switch, Uploader } from 'vant'
import PageHeader from '@/components/PageHeader.vue'
import { useProfilePage } from '@/views/profile/hooks/useProfilePage'

const {
  router,
  saving,
  savingRoles,
  uploadingAvatar,
  uploadingPortfolio,
  feedback,
  selectedRoles,
  addRoleCode,
  form,
  avatarFileList,
  portfolioFileList,
  failedPortfolioUploads,
  feedbackClass,
  onAfterReadAvatar,
  onAfterReadPortfolio,
  retryPortfolioUpload,
  previewPortfolio,
  saveProfile,
  removableRoles,
  addableRoles,
  setPrimaryRole,
  addRole,
  removeRole,
  saveRoles,
} = useProfilePage()
</script>

<template>
  <section class="bounce-in">
    <PageHeader title="个人资料与作品集" back @back="router.back()" />

    <article class="card mb-3 p-3 soft-blue">
      <p class="mb-2 text-sm font-extrabold">
        <i class="fa-solid fa-id-card mr-1 text-blue-500" />账号信息
      </p>
      <CellGroup inset>
        <Field v-model="form.nickname" label="昵称" placeholder="请输入昵称" clearable />
        <Field
          v-model="form.bio"
          label="个人简介"
          type="textarea"
          rows="3"
          autosize
          placeholder="介绍你的风格、擅长领域和服务特点"
        />
        <Cell title="公开作品集到模特端" center>
          <template #right-icon>
            <Switch v-model="form.portfolioPublic" size="20" />
          </template>
        </Cell>
      </CellGroup>

      <div class="mt-3">
        <p class="mb-2 text-xs font-bold text-slate-500">头像上传</p>
        <Uploader
          v-model="avatarFileList"
          :max-count="1"
          :after-read="onAfterReadAvatar"
          :deletable="!uploadingAvatar"
          :disabled="uploadingAvatar"
          preview-size="84"
          upload-text="上传头像"
        />
      </div>
    </article>

    <article class="card mb-3 p-3 soft-pink">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-extrabold">
          <i class="fa-solid fa-user-tag mr-1 text-rose-500" />角色标签
        </p>
        <Button size="small" round plain type="primary" :loading="savingRoles" @click="saveRoles"
          >保存角色</Button
        >
      </div>

      <div class="mb-2 flex flex-wrap gap-2">
        <button
          v-for="role in selectedRoles"
          :key="role.code"
          type="button"
          class="chip"
          :class="
            role.isPrimary
              ? 'border-blue-200 text-blue-600 bg-blue-50'
              : 'border-slate-200 text-slate-600 bg-white'
          "
          @click="setPrimaryRole(role.code)"
        >
          {{ role.name }}
          <span v-if="role.isPrimary" class="ml-1 text-[10px]">主</span>
        </button>
      </div>

      <div class="mb-2 flex items-center gap-2">
        <select
          v-model="addRoleCode"
          class="input h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">选择要添加的角色</option>
          <option v-for="item in addableRoles" :key="item.code" :value="item.code">
            {{ item.name }}
          </option>
        </select>
        <Button size="small" round plain type="primary" @click="addRole">添加</Button>
      </div>

      <div v-if="removableRoles.length" class="flex flex-wrap gap-2 text-xs">
        <button
          v-for="item in removableRoles"
          :key="item.code"
          type="button"
          class="chip border-rose-100 text-rose-500"
          @click="removeRole(item.code)"
        >
          删除 {{ item.name }}
        </button>
      </div>

      <p class="mt-2 text-xs text-slate-500">点击角色可设为主角色；系统至少保留一个角色。</p>
    </article>

    <article class="card mb-3 p-3 soft-pink">
      <div class="mb-2 flex items-center justify-between">
        <p class="text-sm font-extrabold">
          <i class="fa-regular fa-image mr-1 text-rose-500" />作品集
        </p>
        <button class="chip" type="button" @click="previewPortfolio(0)">预览全部</button>
      </div>

      <Uploader
        v-model="portfolioFileList"
        :max-count="12"
        multiple
        :after-read="onAfterReadPortfolio"
        :deletable="!uploadingPortfolio"
        :disabled="uploadingPortfolio"
        preview-size="72"
        upload-text="上传作品图"
      />

      <p class="mt-2 text-xs text-slate-500">建议上传你常用风格的代表作品，方便后续展示与沟通。</p>
      <p class="mt-1 text-xs" :class="form.portfolioPublic ? 'text-blue-500' : 'text-slate-400'">
        {{
          form.portfolioPublic
            ? '当前已开启：模特端可查看你的作品集。'
            : '当前未开启：作品集仅自己可见。'
        }}
      </p>

      <div v-if="failedPortfolioUploads.length" class="mt-2 space-y-1">
        <div
          v-for="item in failedPortfolioUploads"
          :key="item.url || item.file?.name"
          class="flex items-center justify-between text-xs text-amber-700"
        >
          <span>有图片上传失败，可重试</span>
          <Button
            size="small"
            round
            plain
            type="primary"
            :disabled="uploadingPortfolio"
            @click="retryPortfolioUpload(item)"
          >
            重试
          </Button>
        </div>
      </div>
    </article>

    <p v-if="feedback" class="mb-2 text-xs" :class="feedbackClass">{{ feedback }}</p>

    <Button block round type="primary" :loading="saving" @click="saveProfile">
      <i class="fa-solid fa-floppy-disk mr-1" />保存个人资料
    </Button>
  </section>
</template>
