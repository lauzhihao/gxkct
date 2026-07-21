import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./tree-api.ts", import.meta.url), "utf8")
}

test("tree api maps nameless course items to 未设置 and writes back normalized label", async () => {
  const source = await readSource()

  assert.match(source, /else if \(nodeType === "course"\) \{\s*resolvedName = "未设置"\s*\}/)
  assert.match(source, /item\.self\.label = resolvedName/)
  assert.match(source, /throw new Error\(`\$\{nodeType\} 列表项缺少 self\.value`\)/)
})
