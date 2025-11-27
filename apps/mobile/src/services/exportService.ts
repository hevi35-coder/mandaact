import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as MediaLibrary from 'expo-media-library'
import { captureRef } from 'react-native-view-shot'
import { RefObject } from 'react'
import { View } from 'react-native'
import { logger } from '../lib/logger'

export interface ExportOptions {
  format: 'png' | 'jpg'
  quality?: number // 0-1, default 0.9
  fileName?: string
}

/**
 * Capture a view as an image
 */
export async function captureViewAsImage(
  viewRef: RefObject<View | null>,
  options: ExportOptions = { format: 'png' }
): Promise<string> {
  if (!viewRef.current) {
    throw new Error('View reference is not available')
  }

  const uri = await captureRef(viewRef, {
    format: options.format,
    quality: options.quality || 0.9,
    result: 'tmpfile',
  })

  return uri
}

/**
 * Save image to device gallery
 */
export async function saveToGallery(imageUri: string): Promise<boolean> {
  // Request permissions
  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('갤러리 접근 권한이 필요합니다.')
  }

  try {
    const asset = await MediaLibrary.createAssetAsync(imageUri)

    // Optionally create an album
    const album = await MediaLibrary.getAlbumAsync('MandaAct')
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false)
    } else {
      await MediaLibrary.createAlbumAsync('MandaAct', asset, false)
    }

    return true
  } catch (error) {
    logger.error('Save to gallery error', error)
    throw new Error('이미지 저장 중 오류가 발생했습니다.')
  }
}

/**
 * Share image using system share sheet
 */
export async function shareImage(
  imageUri: string,
  options?: { dialogTitle?: string }
): Promise<boolean> {
  const isAvailable = await Sharing.isAvailableAsync()

  if (!isAvailable) {
    throw new Error('공유 기능을 사용할 수 없습니다.')
  }

  await Sharing.shareAsync(imageUri, {
    mimeType: imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg',
    dialogTitle: options?.dialogTitle || '만다라트 공유',
  })

  return true
}

/**
 * Export mandalart view as image and share/save
 */
export async function exportMandalart(
  viewRef: RefObject<View | null>,
  action: 'share' | 'save',
  options: ExportOptions = { format: 'png' }
): Promise<boolean> {
  try {
    // Capture the view
    const uri = await captureViewAsImage(viewRef, options)

    if (action === 'share') {
      return await shareImage(uri)
    } else {
      return await saveToGallery(uri)
    }
  } catch (error) {
    logger.error('Export error', error)
    throw error
  }
}

/**
 * Download image from URL and save to gallery
 */
export async function downloadAndSave(imageUrl: string): Promise<boolean> {
  // Request permissions
  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('갤러리 접근 권한이 필요합니다.')
  }

  try {
    // Download to temporary file
    const filename = `mandalart_${Date.now()}.png`
    const fileUri = `${FileSystem.cacheDirectory}${filename}`

    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri)

    if (downloadResult.status !== 200) {
      throw new Error('이미지 다운로드 실패')
    }

    // Save to gallery
    return await saveToGallery(downloadResult.uri)
  } catch (error) {
    logger.error('Download and save error', error)
    throw error
  }
}
