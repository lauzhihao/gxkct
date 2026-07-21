import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./header.tsx", import.meta.url), "utf8")
}

test("header passes current school setter into identity switch dialog", async () => {
  const source = await readSource()

  assert.match(source, /const \[currentSchoolId, setCurrentSchoolId\] = useLocalStorage<string \| null>\("education-current-school", null\)/)
  assert.match(source, /<IdentitySwitchDialog[\s\S]*onSchoolChange=\{setCurrentSchoolId\}/)
})
