<template>
  <h1>File Upload Example</h1>

  <!-- 选择文件 -->
  <input type="file"
    id="fileInput" />
  <button id="uploadButton">Upload File</button>
</template>
<script>
// 请将此替换为步骤一生成的预签名 URL。
// const signedUrl = "<signedUrl>";


// document.getElementById('uploadButton').addEventListener('click', async () => {
//   const fileInput = document.getElementById('fileInput');
//   const file = fileInput.files[0];

//   if (!file) {
//     alert('Please select a file to upload.');
//     return;
//   }

//   try {
//     await upload(file, signedUrl);
//     alert('File uploaded successfully!');
//   } catch (error) {
//     console.error('Error during upload:', error);
//     alert('Upload failed: ' + error.message);
//   }
// });

// /**
//  * 上传文件到 OSS
//  * @param {File} file - 需要上传的文件
//  * @param {string} presignedUrl - 预签名 URL
//  */
// const upload = async (file, presignedUrl) => {
//   const response = await fetch(presignedUrl, {
//     method: 'PUT',
//     body: file,  // 直接上传整个文件
//   });

//   if (!response.ok) {
//     throw new Error(`Upload failed, status: ${response.status}`);
//   }

//   console.log('File uploaded successfully');
// };
</script>
