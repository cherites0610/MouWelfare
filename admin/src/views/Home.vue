<template>
  <div class="p-4">
    <el-card>
      <h2>異常福利列表</h2>

      <el-table :data="welfareList" style="width: 100%" v-loading="loading">
        <el-table-column prop="title" label="標題" />
        <el-table-column prop="publicationDate" label="發布日期" />
        <el-table-column label="狀態">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '已發布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="view(row)">查看</el-button>
            <el-button size="small" type="success" @click="markNormal(row.id)">標記為正常</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getAbnormalWelfares, markAsNormal } from '../api/welfare'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
const router = useRouter()

const view = (item) => {
  router.push(`/welfare/${item.id}`)
}

const welfareList = ref([])
const loading = ref(false)

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getAbnormalWelfares()
    welfareList.value = res.data.data
  } catch (err) {
    ElMessage.error('讀取異常福利失敗')
  } finally {
    loading.value = false
  }
}

const markNormal = async (id) => {
  try {
    await markAsNormal(id)
    ElMessage.success('已標記為正常')
    fetchList()
  } catch (err) {
    ElMessage.error('操作失敗')
  }
}

onMounted(fetchList)
</script>