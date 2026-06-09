const DB_NAME = 'gympilot-db'
const DB_VERSION = 1
const USER_STORE = 'users'
const STATE_STORE = 'states'

export async function saveUserToDatabase(user) {
  if (!user?.email) return
  const db = await openDatabase()
  await putRecord(db, USER_STORE, {
    ...user,
    email: user.email.toLowerCase(),
    updatedAt: new Date().toISOString(),
  })
}

export async function saveStateToDatabase(email, state) {
  if (!email) return
  const db = await openDatabase()
  await putRecord(db, STATE_STORE, {
    email: email.toLowerCase(),
    state,
    updatedAt: new Date().toISOString(),
  })
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(USER_STORE)) {
        db.createObjectStore(USER_STORE, { keyPath: 'email' })
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'email' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function putRecord(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    store.put(value)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
}
