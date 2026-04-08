# Image Generation Workflow for Claude Cowork

## Overview

BiotechTube articles are generated with AI image prompts stored in the database. Images are created manually via ChatGPT or Gemini using these prompts, then uploaded via the admin editor (Phase B) or directly to Supabase Storage.

## Steps

### 1. Find articles needing images

Query the database for published articles without hero images:

```sql
SELECT id, slug, headline, hero_image_prompt
FROM articles
WHERE hero_image_url IS NULL
  AND status = 'published'
ORDER BY published_at DESC;
```

### 2. Copy the image prompt

Each article has a `hero_image_prompt` field containing a pre-formatted prompt optimized for ChatGPT (DALL-E) or Google Gemini image generation.

The prompt follows BiotechTube's branded visual style — see Brand Style Guide below.

### 3. Generate the image

1. Open ChatGPT or Gemini
2. Paste the `hero_image_prompt` value
3. Generate 2-3 variations
4. Pick the one that best fits:
   - Feels "BiotechTube" — bold, data-visual, abstract biotech
   - No readable text in the image
   - Colors lean navy/green/white
   - Works at both large (article page) and small (card thumbnail) sizes
5. Download at highest resolution available

### 4. Upload to Supabase Storage

Upload the image to the `article-images` bucket:

**Path:** `heroes/{article-slug}.webp`

The admin editor (Phase B) will provide drag-and-drop upload. Until then, upload directly via Supabase Dashboard:

1. Go to Storage > article-images > heroes
2. Upload the image file
3. Copy the public URL

### 5. Update the article

```sql
UPDATE articles
SET hero_image_url = '{public_url}',
    updated_at = now()
WHERE slug = '{article-slug}';
```

## Brand Style Guide for Images

| Element | Value |
|---------|-------|
| Primary background | Deep navy (#0f172a) |
| Accent color | Electric green (#059669) |
| Secondary | Cool gray (#64748b), white |
| Aesthetic | Bloomberg Businessweek + scientific journal |
| Elements | Geometric shapes, data viz patterns, molecular/organic forms |
| Avoid | Stock photo look, literal representations, text in images |
| Variety | Each image unique while belonging to the same visual family |

## Article Type Visual Themes

| Type | Visual Elements |
|------|----------------|
| Funding Deal | Ascending bars, currency symbols, growth shapes |
| Clinical Trial | Hexagonal molecules, scatter plots, DNA patterns |
| Market Analysis | Flowing data streams, treemap patterns, chart waves |
| Company Spotlight | Concentric circles, corporate silhouettes, depth layers |
| Weekly Roundup | Mosaic grid of small icons, compilation feel |
| Breaking News | Angular burst patterns, dynamic movement, sharp contrasts |

## Batch Workflow

For processing multiple articles at once:

1. Run the query from Step 1 to get all articles needing images
2. For each article, the `hero_image_prompt` is ready to paste
3. Generate images in batch (ChatGPT allows multiple generations per session)
4. Upload all images to Supabase Storage
5. Update all articles with their image URLs

## Tips for Best Results

- **Consistency**: Always use the prompts from the database — they include the brand colors and style guidelines
- **Quality check**: The image should look good at 280px wide (card) AND full-width (article page)
- **No text**: Never include readable text, numbers, or letters in the images
- **Aspect ratio**: Always 16:9 for hero images
- **File format**: WebP preferred for performance, PNG acceptable
