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
      throw new Error('cameraPermissionRequired')
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      throw new Error('libraryPermissionRequired')
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

// Raw response from edge function (different format from OCRResult)
interface RawOCRResponse {
  center_goal: string
  sub_goals: Array<{
    title: string
    actions: string[]  // Edge function returns string array, not object array
  }>
}

/**
 * Convert raw edge function response to OCRResult format
 */
function convertToOCRResult(raw: RawOCRResponse): OCRResult {
  return {
    center_goal: raw.center_goal || '',
    sub_goals: (raw.sub_goals || []).slice(0, 8).map((sg, index) => ({
      position: index + 1,
      title: sg.title || '',
      actions: (sg.actions || []).slice(0, 8).map((actionTitle, actionIndex) => ({
        position: actionIndex + 1,
        title: typeof actionTitle === 'string' ? actionTitle : '',
      })),
    })),
  }
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
    throw new Error('ocrProcessingError')
  }

  const rawResult: RawOCRResponse = await response.json()

  // Convert raw response to expected OCRResult format
  return convertToOCRResult(rawResult)
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
    onProgress?.({ stage: 'picking', message: 'picking' })
    const asset = await pickImage(source)

    if (!asset) {
      return null // User cancelled
    }

    // Step 2: Upload image
    onProgress?.({ stage: 'uploading', message: 'uploading', progress: 0 })
    const imageUrl = await uploadImage(asset, userId)
    onProgress?.({ stage: 'uploading', message: 'uploadComplete', progress: 100 })

    // Step 3: Process OCR
    onProgress?.({ stage: 'processing', message: 'processing' })
    const result = await processOCR(imageUrl)

    onProgress?.({ stage: 'done', message: 'done' })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknownError'
    onProgress?.({ stage: 'error', message })
    throw error
  }
}

/**
 * OCR flow from image URI: Upload -> Process OCR
 * Used when image is already picked and we have the URI
 */
export async function runOCRFlowFromUri(
  userId: string,
  imageUri: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<OCRResult | null> {
  try {
    // Create a minimal asset object from URI
    const asset = {
      uri: imageUri,
      mimeType: 'image/jpeg',
    } as ImagePicker.ImagePickerAsset

    // Step 1: Upload image
    onProgress?.({ stage: 'uploading', message: 'uploading', progress: 0 })
    const imageUrl = await uploadImage(asset, userId)
    onProgress?.({ stage: 'uploading', message: 'uploadComplete', progress: 100 })

    // Step 2: Process OCR
    onProgress?.({ stage: 'processing', message: 'processing' })
    const result = await processOCR(imageUrl)

    onProgress?.({ stage: 'done', message: 'done' })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknownError'
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
    throw new Error('loginRequired')
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
    throw new Error('textParsingError')
  }

  const rawResult: RawOCRResponse = await response.json()

  // Convert raw response to expected OCRResult format
  return convertToOCRResult(rawResult)
}
