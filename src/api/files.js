import request from '@/utils/request'

function createFormData(params) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, value)
  })
  return searchParams
}

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
  return request.post('/getUploadSign', createFormData({ originalName }), {
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

export const createFolder = ({ folderName, parentId, scene = 'default' }) => {
  const url = scene === 'upload' ? '/uploadFolder' : '/createFolder'
  return request.post(
    url,
    createFormData({ folderName, parentId }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  )
}

export const deleteFileById = (id) => {
  return request.post('/logicalDelete', createFormData({ fileId: id }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export const fetchRecycleList = () => {
  return request.get('/getRecycleList')
}

export const restoreFiles = (fileId) => {
  return request.post('/restoreFiles', createFormData({ fileId }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export const deleteFilesForever = (ids) => {
  return request.post('/reallyDelete', { ids })
}
