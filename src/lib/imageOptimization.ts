/**
 * Image optimization utilities
 */

/**
 * Lazy load images using Intersection Observer
 */
export function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement
                    const src = img.dataset.src
                    if (src) {
                        img.src = src
                        img.removeAttribute('data-src')
                        observer.unobserve(img)
                    }
                }
            })
        })

        // Observe all images with data-src attribute
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img)
        })

        return imageObserver
    }
    return null
}

/**
 * Preload critical images
 */
export function preloadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = reject
        img.src = url
    })
}

/**
 * Compress image before upload
 */
export async function compressImage(
    file: File,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (e) => {
            const img = new Image()
            img.src = e.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let { width, height } = img

                // Calculate new dimensions
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                    width *= ratio
                    height *= ratio
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Could not get canvas context'))
                    return
                }

                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Could not compress image'))
                        }
                    },
                    file.type,
                    quality
                )
            }
            img.onerror = reject
        }
        reader.onerror = reject
    })
}

/**
 * Get optimized image URL with parameters
 */
export function getOptimizedImageUrl(
    url: string,
    options?: {
        width?: number
        height?: number
        quality?: number
        format?: 'webp' | 'jpeg' | 'png'
    }
): string {
    // If using a CDN that supports image transformation, add query params
    // For now, just return the original URL
    // In production, you might use Cloudinary, Imgix, or similar
    return url
}
