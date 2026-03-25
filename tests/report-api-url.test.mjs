import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('getProjectMatrix uses the v5 project matrix endpoint', async () => {
  const source = await readFile(new URL('../src/modules/courses/report/api.ts', import.meta.url), 'utf8')

  assert.match(
    source,
    /buildApiUrl\(`\/api\/v5\/matrix\/project-matrix\/\$\{courseId\}`\)/,
  )
  assert.doesNotMatch(source, /withQuery\("\/api\/beginreport\/getprojectmatrix"/)
})
