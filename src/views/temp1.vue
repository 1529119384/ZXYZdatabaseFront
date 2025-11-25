<template>
  <div class="temp">


















    <el-button @click="fileUploadDialog = true">文件上传</el-button>
    <el-button>文件夹上传</el-button>













    <el-dialog v-model="fileUploadDialog" title="文件上传" width="500" modal :before-close="handleClose"
      :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false">


      <el-upload drag action="http://127.0.0.1:4523/m1/7374019-7106024-default/upload" :auto-upload="false" multiple
        ref="uploadFiles" :on-success="fileUploadSuccess">
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处或<em>点击上传</em>
        </div>
        <template #tip>
          <div>
            温馨提示温馨提示温馨提示温馨提示
          </div>
        </template>
      </el-upload>




      <template #footer>
        <div class="dialog-footer">
          <el-button @click="fileUploadDialog = false">取消</el-button>
          <el-button type="primary" @click="fileUpload">
            上传
          </el-button>
        </div>
      </template>
    </el-dialog>













  </div>
</template>

<script setup>

import { UploadFilled } from '@element-plus/icons-vue'
import { ref } from 'vue';
const fileUploadDialog = ref(false)
const uploadFiles = ref(null)
const fileUpload = () => {
  uploadFiles.value.submit()
}
const fileUploadSuccess = (response, file, fileList) => {
  console.log(response);
  // console.log(file);
  // console.log(fileList);
  fileUploadSuccessMsg();
}

const fileUploadSuccessMsg = () => {
  console.log("ok");
  open2();
};

import { ElMessage } from 'element-plus'

const open2 = () => {
  // 无需手动 import，也无需 app.use
  ElMessage.success('hello')
}
import { onMounted } from 'vue'
onMounted(() => {
  ElMessage.success('mounted 测试')
})
</script>

<style scoped>
.temp {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 100px;
}
</style>