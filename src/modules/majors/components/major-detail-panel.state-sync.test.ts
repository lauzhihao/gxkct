import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./major-detail-panel.tsx", import.meta.url), "utf8")
}

test("MajorDetail passes selected semester to deleteMajor", async () => {
  const source = await readSource()

  assert.match(source, /const selectedSemesterId = useSemesterStore\(\(state\) => state\.selectedSemesterId\)/)
  assert.match(source, /if \(typeof selectedSemesterId !== "number" \|\| !Number\.isFinite\(selectedSemesterId\)\) \{/)
  assert.match(source, /majorApiService\.deleteMajor\(selectedSemesterId, nodeId\)/)
  assert.match(source, /removeMajorCache\(nodeId\)/)
})
