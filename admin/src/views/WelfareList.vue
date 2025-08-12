<template>
  <div>
    <el-card>
      <div class="flex justify-between items-center mb-4">
        <h2>福利管理</h2>
        <el-button type="primary" @click="goToCreatePage">新增福利</el-button>
      </div>

      <!-- 搜尋欄 -->
      <div class="mb-4 flex gap-2">
        <el-input
          v-model="search"
          placeholder="搜尋標題..."
          clearable
          style="width: 250px"
          @clear="fetchList"
          @input="fetchList"
        />
      </div>

      <!-- 福利列表 -->
      <el-table :data="welfareList" v-loading="loading" style="width: 100%">
        <el-table-column prop="title" label="標題" />
        <el-table-column prop="publicationDate" label="發布日期" />
        <el-table-column label="狀態">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '已發布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button size="small" @click="view(row)">查看</el-button>
            <el-button size="small" type="primary" @click="edit(row)">編輯</el-button>
            <el-button size="small" type="danger" @click="del(row.id)">刪除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分頁 -->
      <div class="mt-4 flex justify-center">
        <el-pagination
          background
          layout="prev, pager, next, jumper"
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getAllWelfares, deleteWelfare } from '../api/welfare'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const welfareList = ref([])
const loading = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getAllWelfares({
      page: page.value,
      pageSize: pageSize.value,
      keyword: search.value,
    })
    welfareList.value = res.data.data.data || []
    total.value = res.data.data.pagination?.total || 0
  } catch (err) {
    console.error(err)
    ElMessage.error('讀取福利失敗')
  } finally {
    loading.value = false
  }
}
// 初始化時讀取 URL page 參數（若存在）
if (route.query.page) {
  const p = parseInt(route.query.page)
  if (!isNaN(p) && p > 0) {
    page.value = p
  }
}

const handlePageChange = (newPage) => {
  page.value = newPage
  // 更新 URL 的 query，保持其它 query 不變
  router.replace({
    query: {
      ...route.query,
      page: newPage.toString(),
    }
  })
  fetchList()
}

const goToCreatePage = () => {
  router.push('/welfare/create')
}

const view = (item) => {
  router.push(`/welfare/${item.id}`)
}

const edit = (item) => {
  router.push(`/welfare/${item.id}/edit`)
}

const del = (id) => {
  ElMessageBox.confirm('確定刪除這個福利嗎？', '警告', {
    confirmButtonText: '刪除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteWelfare(id)
      ElMessage.success('刪除成功')
      fetchList()
    } catch (err) {
      ElMessage.error('刪除失敗')
    }
  }).catch(() => {})
}

// 當 URL 的 page 參數變更，也去同步改變頁碼及重新抓資料
watch(() => route.query.page, (newPage) => {
  const p = parseInt(newPage)
  if (!isNaN(p) && p > 0 && p !== page.value) {
    page.value = p
    fetchList()
  }
})

onMounted(() => {
  fetchList()
})
</script>