<template>
  <div class="p-4">
    <el-card v-if="welfare">
      <h2>{{ welfare.title }}</h2>
      <p><strong>發布日期：</strong>{{ welfare.publicationDate }}</p>
      <p><strong>摘要：</strong>{{ welfare.summary }}</p>
      <p><strong>詳細說明：</strong></p>
      <p style="white-space: pre-line">{{ welfare.details }}</p>
      <p><strong>連結：</strong> <a :href="welfare.link" target="_blank">{{ welfare.link }}</a></p>

      <div class="mt-4 flex gap-2">
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" @click="edit">編輯福利</el-button>
        <el-button type="danger" @click="confirmDelete">刪除福利</el-button>
      </div>
    </el-card>

    <el-empty v-else description="找不到資料或載入中..." />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getWelfareById } from '../api/welfare'
import { ElMessage } from 'element-plus'
import { deleteWelfare } from '../api/welfare'

const route = useRoute()
const router = useRouter()
const welfare = ref(null)

const edit = () => {
  router.push(`/welfare/${route.params.id}/edit`)
}

const confirmDelete = () => {
  ElMessageBox.confirm(
    '確定要刪除這個福利嗎？此操作無法復原。',
    '警告',
    {
      confirmButtonText: '確定刪除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deleteWelfare(route.params.id)
      ElMessage.success('已刪除福利')
      router.push('/')
    } catch (e) {
      ElMessage.error('刪除失敗')
    }
  }).catch(() => {
    ElMessage.info('已取消操作')
  })
}

const fetchWelfare = async () => {
  try {
    const res = await getWelfareById(route.params.id)
    welfare.value = res.data.data
  } catch (e) {
    ElMessage.error('載入失敗')
    router.push('/')
  }
}

const goBack = () => {
  router.back()
}

onMounted(fetchWelfare)
</script>

<style>
.mt-4 {
  margin-top: 16px;
}
</style>