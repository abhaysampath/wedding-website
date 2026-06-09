const TERMS = [
  ['Mehendi', 'https://en.wikipedia.org/wiki/Mehndi'],
  ['Sarees', 'https://en.wikipedia.org/wiki/Sari'],
  ['Saree', 'https://en.wikipedia.org/wiki/Sari'],
  ['Lehengas', 'https://en.wikipedia.org/wiki/Lehenga'],
  ['Lehenga', 'https://en.wikipedia.org/wiki/Lehenga'],
  ['Kurta', 'https://en.wikipedia.org/wiki/Kurta'],
  ['Sherwani', 'https://en.wikipedia.org/wiki/Sherwani'],
  ['Viratham', 'https://en.wikipedia.org/wiki/Vrata'],
  ['Vrutham', 'https://en.wikipedia.org/wiki/Vrata'],
  ['Muhurtham', 'https://en.wikipedia.org/wiki/Muhurta'],
  ['Kaasi Yathirai', 'https://en.wikipedia.org/wiki/Kashi_Yatra'],
  ['Oonjal', 'https://en.wikipedia.org/wiki/Oonjal'],
  ['Kanya daanam', 'https://en.wikipedia.org/wiki/Kanyadan'],
  ['Pani grahanam', 'https://en.wikipedia.org/wiki/Panigrahana'],
  ['Sapthapathi', 'https://en.wikipedia.org/wiki/Saptapadi'],
  ['Grihastha', 'https://en.wikipedia.org/wiki/Grihastha'],
  ['Brahmins', 'https://en.wikipedia.org/wiki/Brahmin'],
  ['Hindu Vedic Astrology', 'https://en.wikipedia.org/wiki/Hindu_astrology'],
  ['Nischayathaartham', 'https://99pandit.com/blog/tamil-brahmin-nichayathartham-ceremony/'],
  ['Aayka Fashion', 'https://aaykafashion.com/'],
  ['All Borrow', 'https://www.allborrow.com/'],
]

const pattern = new RegExp(`\\b(${TERMS.map(([t]) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')

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
    const term = TERMS.find(([t]) => t.toLowerCase() === word.toLowerCase())
    if (term) {
      parts.push({ word: word, url: term[1] })
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
