import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

export interface OCRResult {
  center_goal: string
  sub_goals: Array<{
    position: number
    title: string
    actions: Array<{
      position: number
      title: string
    }>
  }>
}

export interface UploadProgress {
  stage: 'picking' | 'uploading' | 'processing' | 'done' | 'error'
  message: string
  progress?: number
}

/**
 * Pick an image from the device library or camera
 */
export async function pickImage(
  source: 'library' | 'camera' = 'library'
): Promise<ImagePicker.ImagePickerAsset | null> {
  // Request permissions
  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      throw new Error('카메라 권한이 필요합니다.')
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      throw new Error('사진 라이브러리 접근 권한이 필요합니다.')
    }
  }

  // Launch picker
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
          base64: false,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.8,
          base64: false,
        })

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null
  }

  return result.assets[0]
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImage(
  asset: ImagePicker.ImagePickerAsset,
  userId: string
): Promise<string> {
  // Generate unique filename
  const timestamp = Date.now()
  const extension = asset.uri.split('.').pop() || 'jpg'
  const filename = `${userId}/${timestamp}.${extension}`

  // Fetch the image as blob
  const response = await fetch(asset.uri)
  const blob = await response.blob()

  // Convert blob to ArrayBuffer
  const arrayBuffer = await new Response(blob).arrayBuffer()

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('mandalart-images')
    .upload(filename, arrayBuffer, {
      contentType: asset.mimeType || 'image/jpeg',
      upsert: false,
    })

  if (error) {
    logger.error('Upload error', error)
    throw new Error(`이미지 업로드 실패: ${error.message}`)
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('mandalart-images').getPublicUrl(data.path)

  return publicUrl
}

/**
 * Call OCR Edge Function
 */
export async function processOCR(imageUrl: string): Promise<OCRResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('로그인이 필요합니다.')
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ocr-mandalart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image_url: imageUrl }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('OCR error', new Error(errorText))
    throw new Error('OCR 처리 중 오류가 발생했습니다.')
  }

  const result = await response.json()
  return result
}

/**
 * Full OCR flow: Pick image -> Upload -> Process OCR
 */
export async function runOCRFlow(
  userId: string,
  source: 'library' | 'camera' = 'library',
  onProgress?: (progress: UploadProgress) => void
): Promise<OCRResult | null> {
  try {
    // Step 1: Pick image
    onProgress?.({ stage: 'picking', message: '이미지 선택 중...' })
    const asset = await pickImage(source)

    if (!asset) {
      return null // User cancelled
    }

    // Step 2: Upload image
    onProgress?.({ stage: 'uploading', message: '이미지 업로드 중...', progress: 0 })
    const imageUrl = await uploadImage(asset, userId)
    onProgress?.({ stage: 'uploading', message: '업로드 완료', progress: 100 })

    // Step 3: Process OCR
    onProgress?.({ stage: 'processing', message: 'OCR 분석 중...' })
    const result = await processOCR(imageUrl)

    onProgress?.({ stage: 'done', message: '완료!' })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류'
    onProgress?.({ stage: 'error', message })
    throw error
  }
}

/**
 * Parse text input (for manual paste)
 */
export async function parseMandalartText(text: string): Promise<OCRResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('로그인이 필요합니다.')
  }

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/parse-mandalart-text`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('Parse error', new Error(errorText))
    throw new Error('텍스트 파싱 중 오류가 발생했습니다.')
  }

  const result = await response.json()
  return result
}
