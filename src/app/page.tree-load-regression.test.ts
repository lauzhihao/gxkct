import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

async function readSource(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, import.meta.url), "utf8")
}

test("page tree loading effect avoids unstable dependencies", async () => {
  const source = await readSource("./page.tsx")

  assert.match(source, /treeRequestIdRef\s*=\s*useRef\(0\)/)
  assert.match(source, /selectedNodePathRef\s*=\s*useRef<TreeNode\[\]>\(\[\]\)/)
  assert.match(source, /selectedNodePathRef\.current\s*=\s*selectedNodePath/)
  assert.match(source, /const requestId = \+\+treeRequestIdRef\.current/)
  assert.match(source, /if \(treeRequestIdRef\.current !== requestId\) \{\s*return\s*\}/)
  assert.match(source, /void loadTreeData\(\)\s*\n\s*}\s*,\s*\[resetTreeData, resolveNextSelectedNode, router, selectedSemesterId\]\)/)
})

test("useLocalStorage exposes stable setter callbacks", async () => {
  const source = await readSource("../shared/hooks/use-local-storage.ts")

  assert.match(source, /import\s*\{[^}]*useState[^}]*useCallback[^}]*}\s*from\s*"react"|import\s*\{[^}]*useCallback[^}]*useState[^}]*}\s*from\s*"react"/)
  assert.match(source, /const setValue = useCallback\(/)
  assert.match(source, /const removeValue = useCallback\(/)
})
