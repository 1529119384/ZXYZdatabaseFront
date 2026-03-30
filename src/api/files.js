import request from '@/utils/request'

export const fetchFileList = (parentId) => {
  return request.get('/getFileList', {
    params: { parentId },
  })
}

export const deleteFileById = (id) => {
  const params = new URLSearchParams()
  params.append('fileId', id)

  return request.post('/logicalDelete', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
