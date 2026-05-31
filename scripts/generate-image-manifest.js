import { readdirSync, existsSync, writeFileSync } from 'fs'
import { join, parse } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const outputFile = join(__dirname, '..', 'src', 'data', 'images.json')

const jpgDir = join(publicDir, 'jpg')
const wobgDir = join(jpgDir, 'wobg')

if (!existsSync(jpgDir)) {
  console.error('public/jpg/ directory not found')
  process.exit(1)
}

const jpgFiles = readdirSync(jpgDir).filter(f =>
  /\.(jpg|jpeg)$/i.test(f) && !f.startsWith('.')
)

const pngFiles = new Set(
  readdirSync(wobgDir).filter(f => /\.png$/i.test(f) && !f.startsWith('.'))
)

function baseName(filename) {
  return parse(filename).name
}

const images = jpgFiles.map((jpgFile) => {
  const base = baseName(jpgFile)
  const pngName = `${base} Background Removed.png`
  const hasWobg = pngFiles.has(pngName)

  return {
    jpg: `/jpg/${jpgFile}`,
    png: hasWobg ? `/jpg/wobg/${pngName}` : null,
    alt: base,
  }
})

writeFileSync(outputFile, JSON.stringify(images, null, 2))
console.log(`Generated manifest with ${images.length} images (${images.filter(i => i.png).length} with cutouts)`)
