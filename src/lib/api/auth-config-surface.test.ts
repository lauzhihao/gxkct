import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./auth-config.ts", import.meta.url), "utf8")
}

test("clearAllAuthData explicitly clears major and course session caches", async () => {
  const source = await readSource()

  assert.match(source, /import \{ clearCourseCache \} from "@\/shared\/utils\/course-cache"/)
  assert.match(source, /import \{ clearMajorCache \} from "@\/shared\/utils\/major-cache"/)
  assert.match(source, /clearManagedLocalStorage\(\)/)
  assert.match(source, /clearMajorCache\(\)/)
  assert.match(source, /clearCourseCache\(\)/)
  assert.match(source, /sessionStorage\.clear\(\)/)
})
