import request from '@/utils/request'

export const fetchFileList = (parentId) => {
  return request.get('/getFileList', {
    params: { parentId },
  })
}
