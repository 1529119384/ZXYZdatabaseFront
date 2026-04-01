import { confirmUpload, getUploadSign, uploadToOss } from '@/api/files'
export function getErrorDetail(error) {
  if (!error) return 'Unknown error'
  const responseData = error.response?.data
  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData
  }
  if (responseData?.message) {
    return responseData.message
  }
  if (error.message) {
    return error.message
  }
  return 'Unknown error'
}
export function logUploadError(stage, file, error, extra = {}) {
  console.error(`[upload failed] ${stage}`, {
    fileName: file?.name,
    fileSize: file?.size,
    status: error?.response?.status,
    message: error?.message,
    responseData: error?.response?.data,
    ...extra
  })
}
export async function uploadFileWithPresign(file, parentId, onProgress) {
  let uploadUrl = ''
  let objectKey = ''
  let contentType = ''
  let contentDisposition = ''
  try {
    const signRes = await getUploadSign(file.name)
    uploadUrl = signRes.data.uploadUrl
    objectKey = signRes.data.objectKey
    contentType = signRes.data.contentType || ''
    contentDisposition = signRes.data.contentDisposition || ''
    if (!contentType) {
      throw new Error('Missing contentType from getUploadSign response')
    }
    if (!contentDisposition) {
      throw new Error('Missing contentDisposition from getUploadSign response')
    }
    console.info('[upload mode]', {
      fileName: file.name,
      objectKey,
      uploadUrl,
      useContentType: true,
      contentType,
      useContentDisposition: true,
      contentDisposition,
      mode: 'put-with-content-type-and-content-disposition'
    })
  } catch (error) {
    logUploadError('get upload sign failed', file, error)
    throw new Error(`Get upload sign failed: ${getErrorDetail(error)}`)
  }
  try {
    await uploadToOss(uploadUrl, file, {
      onUploadProgress: onProgress,
      contentType,
      contentDisposition
    })
  } catch (error) {
    logUploadError('upload to oss failed', file, error, {
      uploadUrl,
      objectKey,
      contentType,
      contentDisposition
    })
    throw new Error(`Upload to OSS failed: ${getErrorDetail(error)}`)
  }
  try {
    await confirmUpload({
      objectKey,
      originalName: file.name,
      fileSize: file.size,
      parentId
    })
  } catch (error) {
    logUploadError('confirm upload failed', file, error, { objectKey, parentId })
    throw new Error(`Confirm upload failed: ${getErrorDetail(error)}`)
  }
}
