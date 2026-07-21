import assert from "node:assert/strict"
import test from "node:test"

async function loadResourceViewPreference() {
  return import(new URL("./resource-view-preference.ts", import.meta.url).href)
}

class FakePreferenceStorage {
  value: string | null
  getCalls = 0
  setCalls = 0
  removeCalls = 0
  lastKey: string | null = null

  constructor(value: string | null) {
    this.value = value
  }

  getItem(key: string): string | null {
    this.getCalls += 1
    this.lastKey = key
    return this.value
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1
    this.lastKey = key
    this.value = value
  }

  removeItem(key: string): void {
    this.removeCalls += 1
    this.lastKey = key
    this.value = null
  }
}

test("missing preference defaults to list without writing storage", async () => {
  const {
    RESOURCE_VIEW_MODE_STORAGE_KEY,
    readResourceViewPreference,
  } = await loadResourceViewPreference()
  const storage = new FakePreferenceStorage(null)

  assert.equal(readResourceViewPreference(storage), "list")
  assert.equal(storage.getCalls, 1)
  assert.equal(storage.setCalls, 0)
  assert.equal(storage.removeCalls, 0)
  assert.equal(storage.lastKey, RESOURCE_VIEW_MODE_STORAGE_KEY)
})

test("valid grid and list preferences are preserved", async () => {
  const { readResourceViewPreference } = await loadResourceViewPreference()

  for (const viewMode of ["grid", "list"] as const) {
    const storage = new FakePreferenceStorage(viewMode)
    assert.equal(readResourceViewPreference(storage), viewMode)
    assert.equal(storage.setCalls, 0)
    assert.equal(storage.removeCalls, 0)
  }
})

test("invalid preference is removed before an explicit error", async () => {
  const { readResourceViewPreference } = await loadResourceViewPreference()
  const storage = new FakePreferenceStorage("columns")

  assert.throws(
    () => readResourceViewPreference(storage),
    /资源视图偏好值无效，已清除/,
  )
  assert.equal(storage.value, null)
  assert.equal(storage.removeCalls, 1)
})

test("storage read and invalid-value cleanup errors propagate", async () => {
  const { readResourceViewPreference } = await loadResourceViewPreference()
  const readError = new Error("read failed")
  const removeError = new Error("remove failed")

  assert.throws(
    () => readResourceViewPreference({
      getItem: () => {
        throw readError
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }),
    (error) => error === readError,
  )
  assert.throws(
    () => readResourceViewPreference({
      getItem: () => "invalid",
      setItem: () => undefined,
      removeItem: () => {
        throw removeError
      },
    }),
    (error) => error === removeError,
  )
})

test("valid view modes are written and write errors propagate", async () => {
  const {
    RESOURCE_VIEW_MODE_STORAGE_KEY,
    writeResourceViewPreference,
  } = await loadResourceViewPreference()

  for (const viewMode of ["grid", "list"] as const) {
    const storage = new FakePreferenceStorage(null)
    writeResourceViewPreference(storage, viewMode)
    assert.equal(storage.value, viewMode)
    assert.equal(storage.setCalls, 1)
    assert.equal(storage.lastKey, RESOURCE_VIEW_MODE_STORAGE_KEY)
  }

  const writeError = new Error("write failed")
  assert.throws(
    () => writeResourceViewPreference({
      getItem: () => null,
      setItem: () => {
        throw writeError
      },
      removeItem: () => undefined,
    }, "grid"),
    (error) => error === writeError,
  )
})
