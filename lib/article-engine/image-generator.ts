// Article Engine — Image Generator
// Uses Replicate Flux Schnell (fast, ~2s per image) with Pollinations fallback (free)

import { createServerClient } from '@/lib/supabase'

/**
 * Generate a hero image and upload to Supabase Storage.
 * Tries Replicate first (fast, paid), falls back to Pollinations (free, slow).
 * Returns the public URL of the uploaded image, or null on failure.
 */
export async function generateAndUploadImage(
  prompt: string,
  slug: string
): Promise<string | null> {
  try {
    // Try Replicate first (if API token is set)
    if (process.env.REPLICATE_API_TOKEN) {
      const result = await generateViaReplicate(prompt)
      if (result) return await uploadToStorage(result, slug)
    }

    // Fallback to Pollinations (free, no key needed)
    const result = await generateViaPollinations(prompt)
    if (result) return await uploadToStorage(result, slug)

    return null
  } catch (err: any) {
    console.error('Image generation failed:', err.message)
    return null
  }
}

async function generateViaReplicate(prompt: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: prompt.substring(0, 500),
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'jpg',
          output_quality: 90,
        },
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      console.error(`Replicate API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    // Replicate returns output as array of URLs
    const imageUrl = data.output?.[0]
    if (!imageUrl) {
      console.error('Replicate returned no output')
      return null
    }

    // Download the generated image
    const imgResponse = await fetch(imageUrl)
    if (!imgResponse.ok) return null
    return await imgResponse.arrayBuffer()
  } catch (err: any) {
    console.error('Replicate generation failed:', err.message)
    return null
  }
}

async function generateViaPollinations(prompt: string): Promise<ArrayBuffer | null> {
  try {
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 500))
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=675&nologo=true`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      console.error(`Pollinations API error: ${response.status}`)
      return null
    }

    return await response.arrayBuffer()
  } catch (err: any) {
    console.error('Pollinations generation failed:', err.message)
    return null
  }
}

async function uploadToStorage(imageBuffer: ArrayBuffer, slug: string): Promise<string | null> {
  const supabase = createServerClient()
  const filePath = `heroes/${slug}.jpg`

  const { error } = await supabase.storage
    .from('article-images')
    .upload(filePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (error) {
    console.error('Storage upload error:', error.message)
    return null
  }

  const { data: urlData } = supabase.storage
    .from('article-images')
    .getPublicUrl(filePath)

  return urlData.publicUrl
}
