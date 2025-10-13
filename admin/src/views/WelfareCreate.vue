<template>
  <div class="p-4">
    <el-card>
      <h2>新增福利</h2>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" class="mt-4">
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
          <el-input v-model="form.link" placeholder="https://example.com" />
        </el-form-item>

        <el-form-item label="轉發文案" prop="forward">
          <el-input v-model="form.forward" />
        </el-form-item>

        <el-form-item label="狀態" prop="status">
          <el-select v-model="form.status" placeholder="選擇狀態">
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

        <el-form-item label="縣市" prop="locationID">
          <el-select v-model="form.locationID" placeholder="選擇縣市">
            <el-option
              v-for="(label, id) in locationTextMapping"
              :key="id"
              :value="id"
              :label="label"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="分類" prop="categoryID">
          <el-select v-model="form.categoryID" multiple placeholder="選擇分類">
            <el-option
              v-for="(label, id) in serviceTextMapping"
              :key="id"
              :value="id"
              :label="label"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="適用身份" prop="identityID">
          <el-select v-model="form.identityID" multiple placeholder="選擇身份">
            <el-option
              v-for="(label, id) in identityTextMapping"
              :key="id"
              :value="id"
              :label="label"
            />
          </el-select>
        </el-form-item>

        <div class="mt-4 flex gap-2">
          <el-button @click="goBack">取消</el-button>
          <el-button type="primary" @click="submit">儲存</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const formRef = ref()

// Mapping
const identityTextMapping = {
  0:"未設定",1:"20歲以下",2:"20歲-65歲",3:"65歲以上",4:"男性",5:"女性",
  6:"中低收入戶",7:"低收入戶",8:"榮民",9:"身心障礙者",10:"原住民",11:"外籍配偶家庭"
}
const locationTextMapping = {
  0:"未設定",1:"臺北市",2:"新北市",3:"桃園市",4:"臺中市",5:"臺南市",
  6:"高雄市",7:"基隆市",8:"新竹縣",9:"嘉義縣",10:"苗栗縣",11:"彰化縣",
  12:"南投縣",13:"雲林縣",14:"屏東縣",15:"宜蘭縣",16:"花蓮縣",17:"臺東縣",
  18:"澎湖縣",19:"金門縣",20:"連江縣"
}
const serviceTextMapping = {
  0:"未設定",1:"兒童及青少年福利",2:"婦女與幼兒福利",3:"老人福利",
  4:"社會救助福利",5:"身心障礙福利",6:"其他福利"
}

// Form state
const form = ref({
  title: '',
  summary: '',
  details: '',
  link: '',
  forward: '',
  status: 0,
  publicationDate: '',
  locationID: 0,
  categoryID: [],
  identityID: [],
  isAbnormal: false
})

// Form validation rules
const rules = {
  title: [{ required: true, message: '請輸入標題', trigger: 'blur' }],
  summary: [{ required: true, message: '請輸入摘要', trigger: 'blur' }],
  details: [{ required: true, message: '請輸入詳細說明', trigger: 'blur' }],
  link: [{ required: true, type: 'url', message: '請輸入有效連結', trigger: 'blur' }],
  forward: [{ required: true, message: '請輸入轉發文案', trigger: 'blur' }],
  status: [{ required: true, message: '請選擇狀態', trigger: 'change' }],
  publicationDate: [{ required: true, message: '請選擇日期', trigger: 'change' }],
  locationID: [{ required: true, message: '請選擇縣市', trigger: 'change' }],
  categoryID: [{ required: true, type: 'array', min: 1, message: '請選擇至少一個分類', trigger: 'change' }],
  identityID: [{ required: true, type: 'array', min: 1, message: '請選擇至少一個身份', trigger: 'change' }]
}

const goBack = () => router.push('/welfare')

const submit = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('請完整填寫表單')
      return
    }

    try {
      const token = localStorage.getItem('authToken')?.trim()
      if (!token) {
        ElMessage.error('未取得 API Token，請先登入')
        return
      }

      const payload = {
        title: form.value.title,
        summary: form.value.summary,
        details: form.value.details,
        link: form.value.link,
        forward: form.value.forward,
        status: Number(form.value.status),
        publicationDate: form.value.publicationDate,
        locationID: Number(form.value.locationID),
        categoryID: form.value.categoryID.map(Number),
        identityID: form.value.identityID.map(Number),
        isAbnormal: false
      }

      await axios.post('https://mou-api.cherites.org/welfare', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      ElMessage.success('建立成功')
      router.push('/welfare')
    } catch (e) {
      console.error(e)
      ElMessage.error(e?.response?.data?.message || '建立失敗，請檢查欄位內容')
    }
  })
}
</script>

<style>
.mt-4 {
  margin-top: 16px;
}
</style>