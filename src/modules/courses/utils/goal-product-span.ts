/**
 * 教学目标学习产出的合并跨度存在 product 字符串里。
 * 未合并仍是原文。锚点是 [[gs:N]] 加正文，被盖住的格子是 [[gs:0]]。
 * 导出和旧页面只认这个前缀；不要改成新字段。
 */

const GOAL_SPAN_PATTERN = /^\[\[gs:(\d+)\]\]([\s\S]*)$/

export interface GoalProductCell {
  text: string
  span: number
}

function parseProduct(raw: string | null | undefined): { claimed: number; body: string } {
  const value = typeof raw === "string" ? raw : ""
  const matched = GOAL_SPAN_PATTERN.exec(value)
  if (!matched) {
    return { claimed: 1, body: value }
  }
  const claimed = Number(matched[1])
  if (!Number.isInteger(claimed) || claimed < 0) {
    return { claimed: 1, body: value }
  }
  return { claimed, body: matched[2] ?? "" }
}

function encodeProduct(text: string, claimed: number): string {
  if (claimed === 0) return "[[gs:0]]"
  if (claimed >= 2) return `[[gs:${claimed}]]${text}`
  return text
}

function groupOf(text: string, span: number): GoalProductCell[] {
  if (span <= 1) return [{ text, span: 1 }]
  const cells: GoalProductCell[] = [{ text, span }]
  for (let offset = 1; offset < span; offset += 1) {
    cells.push({ text, span: 0 })
  }
  return cells
}

export function layoutGoalColumns(products: Array<string | null | undefined>): GoalProductCell[] {
  const parsed = products.map(parseProduct)
  const columns: GoalProductCell[] = []
  let index = 0
  while (index < parsed.length) {
    const item = parsed[index]
    if (item.claimed >= 2) {
      let span = 1
      while (span < item.claimed && index + span < parsed.length && parsed[index + span].claimed === 0) {
        span += 1
      }
      columns.push(...groupOf(item.body, span))
      index += span
      continue
    }
    if (item.claimed === 0) {
      columns.push({ text: "", span: 1 })
      index += 1
      continue
    }
    columns.push({ text: item.body, span: 1 })
    index += 1
  }
  return columns
}

function encodeColumns(columns: GoalProductCell[]): string[] {
  const products: string[] = []
  for (const cell of columns) {
    if (cell.span === 0) continue
    if (cell.span <= 1) {
      products.push(cell.text)
      continue
    }
    products.push(encodeProduct(cell.text, cell.span))
    for (let offset = 1; offset < cell.span; offset += 1) {
      products.push(encodeProduct("", 0))
    }
  }
  return products
}

function findAnchor(columns: GoalProductCell[], index: number): number {
  if (index < 0 || index >= columns.length) return -1
  if (columns[index].span > 0) return index
  let anchor = index - 1
  while (anchor >= 0 && columns[anchor].span === 0) anchor -= 1
  if (anchor < 0) return -1
  if (anchor + columns[anchor].span <= index) return -1
  return anchor
}

function replaceGroup(columns: GoalProductCell[], anchor: number, span: number, next: GoalProductCell[]): GoalProductCell[] {
  return [...columns.slice(0, anchor), ...next, ...columns.slice(anchor + span)]
}

export function goalProductText(products: Array<string | null | undefined>, index: number): string {
  const columns = layoutGoalColumns(products)
  if (index < 0 || index >= columns.length) return ""
  return columns[index].text
}

export function rewriteGoalText(products: Array<string | null | undefined>, index: number, text: string): string[] {
  const columns = layoutGoalColumns(products)
  if (index < 0 || index >= columns.length) {
    return products.map((item) => item ?? "")
  }
  const anchor = findAnchor(columns, index)
  if (anchor < 0) {
    columns[index] = { text, span: 1 }
    return encodeColumns(columns)
  }
  const span = columns[anchor].span
  if (index !== anchor) {
    if (text === columns[anchor].text) return encodeColumns(columns)
    const left = index - anchor
    const right = span - left - 1
    const next = [
      ...groupOf(columns[anchor].text, left),
      { text, span: 1 },
      ...groupOf(columns[anchor].text, right),
    ]
    return encodeColumns(replaceGroup(columns, anchor, span, next))
  }
  columns[anchor] = { text, span }
  return encodeColumns(columns)
}

export function mergeGoalWithNext(products: Array<string | null | undefined>, index: number): string[] {
  const columns = layoutGoalColumns(products)
  const anchor = findAnchor(columns, index)
  if (anchor < 0) return products.map((item) => item ?? "")
  const span = columns[anchor].span
  const nextIndex = anchor + span
  if (nextIndex >= columns.length || columns[nextIndex].span <= 0) {
    return encodeColumns(columns)
  }
  const nextSpan = columns[nextIndex].span
  const text = columns[anchor].text.trim() ? columns[anchor].text : columns[nextIndex].text
  return encodeColumns(replaceGroup(columns, anchor, span + nextSpan, groupOf(text, span + nextSpan)))
}

export function unmergeGoal(products: Array<string | null | undefined>, index: number): string[] {
  const columns = layoutGoalColumns(products)
  const anchor = findAnchor(columns, index)
  if (anchor < 0 || columns[anchor].span <= 1) {
    return encodeColumns(columns)
  }
  const text = columns[anchor].text
  const plain = Array.from({ length: columns[anchor].span }, () => ({ text, span: 1 }))
  return encodeColumns(replaceGroup(columns, anchor, columns[anchor].span, plain))
}

export function removeGoalProduct(products: Array<string | null | undefined>, index: number): string[] {
  const columns = layoutGoalColumns(products)
  if (index < 0 || index >= columns.length) {
    return products.map((item) => item ?? "")
  }
  const anchor = findAnchor(columns, index)
  if (anchor < 0) {
    return encodeColumns(columns.filter((_, cellIndex) => cellIndex !== index))
  }
  const span = columns[anchor].span
  if (span <= 1) {
    return encodeColumns(columns.filter((_, cellIndex) => cellIndex !== index))
  }
  const next = groupOf(columns[anchor].text, span - 1)
  return encodeColumns(replaceGroup(columns, anchor, span, next))
}
