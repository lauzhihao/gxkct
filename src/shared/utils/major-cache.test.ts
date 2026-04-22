import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./major-cache.ts", import.meta.url), "utf8")
}

test("major cache exposes explicit removal for deleted majors", async () => {
  const source = await readSource()

  assert.match(source, /export function removeMajorCache\(majorId: string\): void/)
  assert.match(source, /delete cache\[majorId\]/)
  assert.match(source, /sessionStorage\.setItem\(MAJOR_CACHE_KEY, JSON\.stringify\(cache\)\)/)
})

test("major cache can sync by department and semester to drop stale majors", async () => {
  const source = await readSource()

  assert.match(source, /export function syncMajorCacheForDepartment\(/)
  assert.match(source, /if \(itemDepartmentId === departmentId && itemSemesterId === normalizedSemesterId\) \{/)
  assert.match(source, /delete cache\[majorId\]/)
})

test("major cache exposes full clear for logout cleanup", async () => {
  const source = await readSource()

  assert.match(source, /export function clearMajorCache\(\): void/)
  assert.match(source, /sessionStorage\.removeItem\(MAJOR_CACHE_KEY\)/)
})
