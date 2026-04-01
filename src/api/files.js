import request from '@/utils/request'
export const fetchFileList = (parentId) => {
  return request.get('/getFileList', {
    params: { parentId },
  })
}
export const getFileDownloadUrl = (fileId) => {
  return request.get('/getFileDownloadUrl', {
    params: { fileId },
  })
}
export const getUploadSign = (originalName) => {
  const params = new URLSearchParams()
  params.append('originalName', originalName)
  return request.post('/getUploadSign', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
export const uploadToOss = async (uploadUrl, file, options = {}) => {
  const { onUploadProgress, contentType, contentDisposition } = options
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('PUT', uploadUrl, true)

    if (contentType) {
      xhr.setRequestHeader('Content-Type', contentType)
    }
    if (contentDisposition) {
      xhr.setRequestHeader('Content-Disposition', contentDisposition)
    }

    if (typeof onUploadProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        onUploadProgress({
          loaded: event.loaded,
          total: event.total || file.size,
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response)
        return
      }

      const error = new Error(`OSS upload failed: status ${xhr.status}`)
      error.response = {
        status: xhr.status,
        data: xhr.responseText,
      }
      reject(error)
    }

    xhr.onerror = () => {
      const error = new Error('OSS upload failed: network error')
      error.response = {
        status: xhr.status || 0,
        data: xhr.responseText,
      }
      reject(error)
    }

    xhr.send(file)
  })
}
export const confirmUpload = ({ objectKey, originalName, fileSize, parentId }) => {
  return request.post('/confirmUpload', {
    objectKey,
    originalName,
    fileSize,
    parentId,
  })
}
export const deleteFileById = (id) => {
  const params = new URLSearchParams()
  params.append('fileId', id)
  return request.post('/logicalDelete', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
export const fetchRecycleList = () => {
  return request.get('/getRecycleList')
}
export const restoreFiles = (fileId) => {
  const params = new URLSearchParams()
  params.append('fileId', fileId)
  return request.post('/restoreFiles', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
export const deleteFilesForever = (ids) => {
  return request.post('/reallyDelete', { ids })
}
