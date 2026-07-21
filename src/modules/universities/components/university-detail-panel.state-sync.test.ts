import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./university-detail-panel.tsx", import.meta.url), "utf8")
}

test("UniversityDetail passes selected semester to createDepartment", async () => {
  const source = await readSource()

  assert.match(source, /const selectedSemesterId = useSemesterStore\(\(state\) => state\.selectedSemesterId\)/)
  assert.match(source, /api\.tree\.createDepartment\(universityId\.toString\(\), newDeptName\.trim\(\), selectedSemesterId\)/)
})
