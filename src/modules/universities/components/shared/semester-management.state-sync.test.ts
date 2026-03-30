import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./semester-management.tsx", import.meta.url), "utf8")
}

test("semester management syncs current semester into global store after switch", async () => {
  const source = await readSource()

  assert.match(source, /const updateCurrentSemesterId = useSemesterStore\(\(state\) => state\.updateCurrentSemesterId\)/)
  assert.match(source, /const updateSemesterList = useSemesterStore\(\(state\) => state\.updateSemesterList\)/)
  assert.match(source, /updateCurrentSemesterId\(semester\.id\)/)
  assert.match(source, /const latestSemesterList = await loadSemesters\(\)/)
  assert.match(source, /if \(latestSemesterList\) \{\s*updateSemesterList\(latestSemesterList\)/)
})

test("semester management confirms before switching current semester and closes dialog on success", async () => {
  const source = await readSource()

  assert.match(source, /AlertDialog,/)
  assert.match(source, /AlertDialogAction,/)
  assert.match(source, /AlertDialogCancel,/)
  assert.match(source, /const \[pendingCurrentSemester, setPendingCurrentSemester\] = useState<SemesterBrief \| null>\(null\)/)
  assert.match(source, /onClick=\{\(\) => setPendingCurrentSemester\(semester\)\}/)
  assert.match(source, /<AlertDialog[\s\S]*open=\{pendingCurrentSemester !== null\}/)
  assert.match(source, /const semester = pendingCurrentSemester/)
  assert.match(source, /setIsDialogOpen\(false\)/)
  assert.match(source, /setPendingCurrentSemester\(null\)/)
})
