import { MAX_TEXT, MAX_IMAGE_CHARS } from '../constants.js'
import { badRequest, ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { checkContent, extractTextFromImage } from '../utils/checker.js'
import { loadBrand } from './brand.controller.js'

// POST /api/check  (creator)
export const runCheck = asyncHandler(async (req, res) => {
  const text = String(req.body?.text || '').trim()
  if (!text) throw badRequest('Paste some text to check.')
  if (text.length > MAX_TEXT) throw badRequest(`Please keep the text under ${MAX_TEXT} characters.`)
  const brand = await loadBrand(req.user)
  const result = await checkContent(text, brand)
  res.json({ ...result, brandVersion: brand.version })
})

// POST /api/extract  (creator) : image -> text using Gemini
export const extractText = asyncHandler(async (req, res) => {
  const image = String(req.body?.image || '')
  const mime = String(req.body?.mime || '')
  if (!image || !/^image\/(png|jpe?g|webp|gif)$/.test(mime)) throw badRequest('Please upload a PNG, JPG, WEBP or GIF image.')
  if (image.length > MAX_IMAGE_CHARS) throw badRequest('That image is too large. Please use one under 3 MB.')
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(503, 'Reading text from images needs the AI service, which is not configured on this server. Please paste the text instead.')
  }
  try {
    const text = await extractTextFromImage(image, mime)
    if (!text) throw new Error('empty')
    res.json({ text: text.slice(0, MAX_TEXT) })
  } catch (e) {
    console.error('[ai] extract failed:', e.message)
    throw new ApiError(502, 'Could not read text from that image. Please paste the text instead.')
  }
})
