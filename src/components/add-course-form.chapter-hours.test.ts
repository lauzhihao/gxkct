import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(): Promise<string> {
  return readFile(new URL("./add-course-form.tsx", import.meta.url), "utf8")
}

test("server edit preserves raw chapter hours and rejects blank values", async () => {
  const source = await readSource()

  assert.match(
    source,
    /const getServerChapterHourSource = \([\s\S]*chapter\.theoryPeriod : chapter\.practicePeriod/,
  )
  assert.match(
    source,
    /setServerChapterHourInputs\(createServerChapterHourInputs\(courseData\.courseMatrixVOS\)\)/,
  )
  assert.match(source, /else if \(trimmedValue === ""\) \{\s*error = `请输入\$\{fieldLabel\}`/)
  assert.doesNotMatch(
    source,
    /if \(trimmedValue === ""\) \{\s*updateChapter\(chapterId, column, 0\)/,
  )
  assert.match(
    source,
    /remapServerChapterHourInputsAfterRemoval\(chapters, id, currentInputs\)/,
  )
  assert.doesNotMatch(source, /setServerChapterHourInputs\(\{\}\)/)
})

test("legacy chapter normalization keeps its existing fallback semantics", async () => {
  const source = await readSource()

  assert.match(
    source,
    /isServerEditValidation\s*\? chapter\.theoryPeriod\s*:\s*chapter\.theoryHours \?\? chapter\.theoryPeriod \?\? 0/,
  )
  assert.match(
    source,
    /isServerEditValidation\s*\? chapter\.practicePeriod\s*:\s*chapter\.practiceHours \?\? chapter\.practicePeriod \?\? 0/,
  )
  assert.match(source, /updateChapter\(chapterId, column, Number\.parseInt\(event\.target\.value\) \|\| 0\)/)
})

test("server edit adds chapter hour inputs as blank while legacy keeps numeric defaults", async () => {
  const source = await readSource()

  assert.match(
    source,
    /if \(isServerEditValidation\) \{\s*const newRowIndex = chapters\.length[\s\S]*getChapterHourFieldKey\(newRowIndex, "theoryHours"\)[\s\S]*value: ""[\s\S]*getChapterHourFieldKey\(newRowIndex, "practiceHours"\)[\s\S]*value: ""/,
  )
  assert.match(
    source,
    /setChapters\(prev => \(\[\.\.\.prev, \{ id: Date\.now\(\)\.toString\(\), name: "", theoryHours: 0, practiceHours: 0 \}\]\)\)/,
  )
})
