// Article Engine — Pollinations.ai Image Generator
// Generates hero images via Pollinations (free, no API key) and uploads to Supabase Storage

import { createServerClient } from '@/lib/supabase'

/**
 * Generate a hero image using Pollinations.ai and upload it to Supabase Storage.
 * Returns the public URL of the uploaded image, or null on failure.
 */
export async function generateAndUploadImage(
  prompt: string,
  slug: string
): Promise<string | null> {
  try {
    const encodedPrompt = encodeURIComponent(prompt)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=675&nologo=true`

    // Fetch the generated image (can take 10-30s)
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(60000), // 60s timeout
    })

    if (!response.ok) {
      console.error(`Pollinations API error: ${response.status}`)
      return null
    }

    const imageBuffer = await response.arrayBuffer()

    // Upload to Supabase Storage
    const supabase = createServerClient()
    const filePath = `heroes/${slug}.png`

    const { error } = await supabase.storage
      .from('article-images')
      .upload(filePath, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      })

    if (error) {
      console.error('Storage upload error:', error.message)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('article-images')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (err: any) {
    console.error('Image generation failed:', err.message)
    return null
  }
}
