<template>
  <div class="p-4">
    <el-card v-if="form">
      <h2>編輯福利</h2>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="mt-4">
        <el-form-item label="標題" prop="title">
          <el-input v-model="form.title" />
        </el-form-item>

        <el-form-item label="摘要" prop="summary">
          <el-input v-model="form.summary" />
        </el-form-item>

        <el-form-item label="詳細說明" prop="details">
          <el-input type="textarea" v-model="form.details" rows="5" />
        </el-form-item>

        <el-form-item label="連結" prop="link">
          <el-input v-model="form.link" />
        </el-form-item>

        <el-form-item label="狀態" prop="status">
          <el-select v-model="form.status">
            <el-option :value="0" label="草稿" />
            <el-option :value="1" label="已發布" />
          </el-select>
        </el-form-item>

        <el-form-item label="發布日期" prop="publicationDate">
          <el-date-picker
            v-model="form.publicationDate"
            type="date"
            placeholder="選擇日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>

        <div class="mt-4 flex gap-2">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" @click="submit">儲存修改</el-button>
        </div>
      </el-form>
    </el-card>

    <el-empty v-else description="載入中..." />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getWelfareById, updateWelfare } from '../api/welfare'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const form = ref(null)
const formRef = ref()

const rules = {
  title: [{ required: true, message: '請輸入標題', trigger: 'blur' }],
  summary: [{ required: true, message: '請輸入摘要', trigger: 'blur' }],
  details: [{ required: true, message: '請輸入詳細說明', trigger: 'blur' }],
  link: [{ required: true, message: '請輸入連結', trigger: 'blur' }],
  publicationDate: [{ required: true, message: '請選擇日期', trigger: 'change' }],
  status: [{ required: true, message: '請選擇狀態', trigger: 'change' }],
  categoryID: [{ required: true, message: '請輸入分類 ID', trigger: 'blur' }],
  identityID: [{ required: true, message: '請輸入身份 ID', trigger: 'blur' }],
  locationID: [{ required: true, message: '請輸入地點 ID', trigger: 'blur' }]
}

const fetchData = async () => {
  try {
    const res = await getWelfareById(route.params.id)
    form.value = res.data.data
  } catch (e) {
    ElMessage.error('讀取失敗')
    router.push('/')
  }
}

const goBack = () => {
  router.back()
}

const submit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('請完整填寫表單')
      return
    }

    try {
      const payload = {
        ...form.value,
        categoryID: JSON.parse(form.value.categoryID),
        identityID: JSON.parse(form.value.identityID)
      }
      await createWelfare(payload)
      ElMessage.success('更新成功')
      router.push('/')
    } catch (e) {
      ElMessage.error('更新失敗，請檢查欄位內容')
    }
  })
}


onMounted(fetchData)
</script>

<style>
.mt-4 {
  margin-top: 16px;
}
.gap-2 {
  gap: 8px;
}
</style>