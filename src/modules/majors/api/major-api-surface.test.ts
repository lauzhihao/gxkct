import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./MajorApiService.ts", import.meta.url), "utf8")
}

test("MajorApiService deleteMajor uses v5 semester-aware delete endpoint", async () => {
  const source = await readSource()

  assert.match(source, /async deleteMajor\(semesterId: number, majorId: string\): Promise<ApiResponse<null>>/)
  assert.match(source, /this\.httpAdapter\.delete\(`\/api\/v5\/tree\/semesters\/\$\{semesterId\}\/majors\/\$\{majorId\}`\)/)
})
