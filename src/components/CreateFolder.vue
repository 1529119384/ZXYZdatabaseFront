<template>
  <el-dialog v-model="createFolderDialog"
    title="新建文件夹"
    width="300"
    show-close
    center
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false">

    <el-input v-model="newFolderName"
      focusable
      clearable
      style="width: 240px"
      placeholder="请输入文件夹名称" />

    <template #footer
      center>
      <div class="dialog-footer">
        <el-button type="primary"
          center
          @click="createFolder()">
          创建文件夹
        </el-button>


      </div>
    </template>

  </el-dialog>



</template>
<script setup>
import { ref } from 'vue';
const createFolderDialog = ref(false);
const newFolderName = ref('新建文件夹');
import request from '@/utils/request';
import { useCurrentIdStore } from '@/store/currentId';
const currentIdStore = useCurrentIdStore()

function createFolder() {
  const params = new URLSearchParams();
  params.append('folderName', newFolderName.value);
  params.append('parentId', currentIdStore.currentId);

  request.post('/createFolder', params)
    .then((res) => {
      console.log('创建文件夹成功:', res);
      createFolderDialog.value = false;
    })
    .catch((error) => {
      console.error('创建文件夹失败:', error);
    });
}

defineExpose({
  openCreateFolder() {
    createFolderDialog.value = true;
  },
})

</script>

<style></style>