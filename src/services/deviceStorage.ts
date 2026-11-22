import type { FiscalDatabase } from '../types';

const DB_NAME = 'FiscalObraDeviceDB';
const DB_VERSION = 1;
const STORE_STATE = 'appState';
const STORE_FILES = 'files';
const OPFS_DIR = 'fiscalobra_files';

export interface StoredDeviceFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
}

export interface StoredDeviceFileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface DeviceStorageStats {
  usedBytes: number;
  quotaBytes: number;
  persisted: boolean;
  opfsSupported: boolean;
  fileCount: number;
  totalFilesBytes: number;
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE);
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeToOpfs(id: string, blob: Blob): Promise<void> {
  try {
    if (!navigator.storage || typeof navigator.storage.getDirectory !== 'function') return;
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR, { create: true });
    const fileHandle = await dir.getFileHandle(id, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  } catch {
    // IndexedDB remains primary if OPFS is unavailable in current context
  }
}

async function readFromOpfs(id: string): Promise<Blob | null> {
  try {
    if (!navigator.storage || typeof navigator.storage.getDirectory !== 'function') return null;
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR);
    const fileHandle = await dir.getFileHandle(id);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

async function removeFromOpfs(id: string): Promise<void> {
  try {
    if (!navigator.storage || typeof navigator.storage.getDirectory !== 'function') return;
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle(OPFS_DIR);
    await dir.removeEntry(id);
  } catch {
    // Ignore if absent
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Falha ao codificar arquivo.'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return await res.blob();
}

export const LOCAL_FILE_PREFIX = 'local-file://';

export function isLocalFileUrl(url: string | undefined): boolean {
  return Boolean(url && url.startsWith(LOCAL_FILE_PREFIX));
}

export function extractLocalFileId(url: string): string {
  return url.slice(LOCAL_FILE_PREFIX.length);
}

export const deviceStorage = {
  async requestPersistence(): Promise<boolean> {
    try {
      if (navigator.storage && typeof navigator.storage.persist === 'function') {
        return await navigator.storage.persist();
      }
    } catch {
      // Ignore
    }
    return false;
  },

  async loadDatabaseLocal(): Promise<FiscalDatabase | null> {
    const idb = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_STATE, 'readonly');
      const req = tx.objectStore(STORE_STATE).get('db');
      req.onsuccess = () => resolve((req.result as FiscalDatabase | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  },

  async saveDatabaseLocal(data: FiscalDatabase): Promise<void> {
    const idb = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_STATE, 'readwrite');
      tx.objectStore(STORE_STATE).put(data, 'db');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async saveFileToDevice(file: Blob, customName?: string): Promise<StoredDeviceFileMeta & { url: string }> {
    const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const name =
      customName || (file instanceof File ? file.name : `arquivo_${Date.now()}.bin`);
    const record: StoredDeviceFile = {
      id,
      name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      createdAt: new Date().toISOString(),
      blob: file,
    };

    const idb = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_FILES, 'readwrite');
      tx.objectStore(STORE_FILES).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    await writeToOpfs(id, file);

    return {
      id,
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      createdAt: record.createdAt,
      url: `${LOCAL_FILE_PREFIX}${id}`,
    };
  },

  async getFile(id: string): Promise<StoredDeviceFile | null> {
    const idb = await openIdb();
    const record = await new Promise<StoredDeviceFile | null>((resolve, reject) => {
      const tx = idb.transaction(STORE_FILES, 'readonly');
      const req = tx.objectStore(STORE_FILES).get(id);
      req.onsuccess = () => resolve((req.result as StoredDeviceFile | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });

    if (record) return record;

    const opfsBlob = await readFromOpfs(id);
    if (!opfsBlob) return null;
    return {
      id,
      name: id,
      mimeType: opfsBlob.type || 'application/octet-stream',
      size: opfsBlob.size,
      createdAt: new Date().toISOString(),
      blob: opfsBlob,
    };
  },

  async listFiles(): Promise<StoredDeviceFileMeta[]> {
    const idb = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_FILES, 'readonly');
      const req = tx.objectStore(STORE_FILES).getAll();
      req.onsuccess = () => {
        const list = (req.result as StoredDeviceFile[]) ?? [];
        resolve(
          list
            .map((f) => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              size: f.size,
              createdAt: f.createdAt,
            }))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        );
      };
      req.onerror = () => reject(req.error);
    });
  },

  async deleteFile(id: string): Promise<void> {
    const idb = await openIdb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_FILES, 'readwrite');
      tx.objectStore(STORE_FILES).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    await removeFromOpfs(id);
  },

  async clearAllFiles(): Promise<void> {
    const idb = await openIdb();
    const files = await this.listFiles();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_FILES, 'readwrite');
      tx.objectStore(STORE_FILES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    for (const f of files) {
      await removeFromOpfs(f.id);
    }
  },

  async downloadStoredFile(url: string, fallbackName: string): Promise<void> {
    if (isLocalFileUrl(url)) {
      const file = await this.getFile(extractLocalFileId(url));
      if (!file) return;
      const objUrl = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = file.name || fallbackName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = fallbackName;
    a.click();
  },

  async getStorageStats(): Promise<DeviceStorageStats> {
    let usedBytes = 0;
    let quotaBytes = 0;
    let persisted = false;

    try {
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        usedBytes = est.usage ?? 0;
        quotaBytes = est.quota ?? 0;
      }
      if (navigator.storage?.persisted) {
        persisted = await navigator.storage.persisted();
      }
    } catch {
      // Ignore
    }

    const files = await this.listFiles();
    const totalFilesBytes = files.reduce((acc, f) => acc + f.size, 0);

    return {
      usedBytes,
      quotaBytes,
      persisted,
      opfsSupported: Boolean(
        navigator.storage && typeof navigator.storage.getDirectory === 'function'
      ),
      fileCount: files.length,
      totalFilesBytes,
    };
  },

  async exportFullBackup(db: FiscalDatabase): Promise<void> {
    const idb = await openIdb();
    const rawFiles = await new Promise<StoredDeviceFile[]>((resolve, reject) => {
      const tx = idb.transaction(STORE_FILES, 'readonly');
      const req = tx.objectStore(STORE_FILES).getAll();
      req.onsuccess = () => resolve((req.result as StoredDeviceFile[]) ?? []);
      req.onerror = () => reject(req.error);
    });

    const encodedFiles = await Promise.all(
      rawFiles.map(async (f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        createdAt: f.createdAt,
        dataUrl: await blobToBase64(f.blob),
      }))
    );

    const payload = {
      app: 'FiscalObra Pro',
      exportedAt: new Date().toISOString(),
      database: db,
      files: encodedFiles,
    };

    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const fileName = `fiscalobra-backup-${new Date().toISOString().slice(0, 10)}.json`;

    const win = window as unknown as {
      showSaveFilePicker?: (opts: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    };

    if (typeof win.showSaveFilePicker === 'function') {
      try {
        const handle = await win.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'Backup FiscalObra Pro', accept: { 'application/json': ['.json'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonBlob);
        await writable.close();
        return;
      } catch {
        // Fallback to standard download if user cancels or picker blocked in iframe
      }
    }

    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  async importFullBackup(file: File): Promise<FiscalDatabase> {
    const text = await file.text();
    const parsed = JSON.parse(text) as {
      database?: FiscalDatabase;
      files?: Array<{
        id: string;
        name: string;
        mimeType: string;
        size: number;
        createdAt: string;
        dataUrl: string;
      }>;
    };

    if (!parsed.database || !Array.isArray(parsed.database.contratos)) {
      throw new Error('Arquivo de backup inválido.');
    }

    if (Array.isArray(parsed.files)) {
      const idb = await openIdb();
      for (const f of parsed.files) {
        const blob = await dataUrlToBlob(f.dataUrl);
        const record: StoredDeviceFile = {
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: blob.size,
          createdAt: f.createdAt,
          blob,
        };
        await new Promise<void>((resolve, reject) => {
          const tx = idb.transaction(STORE_FILES, 'readwrite');
          tx.objectStore(STORE_FILES).put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        await writeToOpfs(f.id, blob);
      }
    }

    await this.saveDatabaseLocal(parsed.database);
    return parsed.database;
  },
};

export function formatBytesBR(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
