export function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field.trim()); field = ''
    } else if (ch === '\n') {
      row.push(field.trim())
      if (row.some(c => c)) rows.push(row)
      row = []; field = ''
    } else if (ch === '\r') {
      // skip
    } else {
      field += ch
    }
  }
  if (row.some(c => c) || field) {
    row.push(field.trim())
    rows.push(row)
  }
  return rows
}
