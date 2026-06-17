const GLOSSARY = new Map([
  ['mehendi', 'https://en.wikipedia.org/wiki/Mehndi'],
  ['sarees', 'https://en.wikipedia.org/wiki/Sari'],
  ['saree', 'https://en.wikipedia.org/wiki/Sari'],
  ['lehengas', 'https://en.wikipedia.org/wiki/Lehenga'],
  ['lehenga', 'https://en.wikipedia.org/wiki/Lehenga'],
  ['kurta', 'https://en.wikipedia.org/wiki/Kurta'],
  ['sherwani', 'https://en.wikipedia.org/wiki/Sherwani'],
  ['viratham', 'https://en.wikipedia.org/wiki/Vrata'],
  ['vrutham', 'https://en.wikipedia.org/wiki/Vrata'],
  ['muhurtham', 'https://en.wikipedia.org/wiki/Muhurta'],
  ['kaasi yathirai', 'https://en.wikipedia.org/wiki/Kashi_Yatra'],
  ['oonjal', 'https://en.wikipedia.org/wiki/Oonjal'],
  ['kanya daanam', 'https://en.wikipedia.org/wiki/Kanyadan'],
  ['pani grahanam', 'https://en.wikipedia.org/wiki/Panigrahana'],
  ['sapthapathi', 'https://en.wikipedia.org/wiki/Saptapadi'],
  ['grihastha', 'https://en.wikipedia.org/wiki/Grihastha'],
  ['brahmins', 'https://en.wikipedia.org/wiki/Brahmin'],
  ['hindu vedic astrology', 'https://en.wikipedia.org/wiki/Hindu_astrology'],
  ['nischayathaartham', 'https://99pandit.com/blog/tamil-brahmin-nichayathartham-ceremony/'],
  ['aayka fashion', 'https://aaykafashion.com/'],
  ['all borrow', 'https://www.allborrow.com'],
])

const escaped = [
  'Mehendi',
  'Sarees',
  'Saree',
  'Lehengas',
  'Lehenga',
  'Kurta',
  'Sherwani',
  'Viratham',
  'Vrutham',
  'Muhurtham',
  'Kaasi Yathirai',
  'Oonjal',
  'Kanya daanam',
  'Pani grahanam',
  'Sapthapathi',
  'Grihastha',
  'Brahmins',
  'Hindu Vedic Astrology',
  'Nischayathaartham',
  'Aayka Fashion',
  'All Borrow',
].map(t => t.replace(/[.*+?^${}()|[\]\\]/g, c => '\\' + c))

const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')

export function linkTerms(text) {
  if (!text) return text
  const parts = []
  let lastIndex = 0
  let match
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const word = match[0]
    const url = GLOSSARY.get(word.toLowerCase())
    if (url) {
      parts.push({ word, url })
    } else {
      parts.push(word)
    }
    lastIndex = pattern.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}
