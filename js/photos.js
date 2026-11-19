// 식단 사진 저장소 (IndexedDB). 키: "YYYY-MM-DD|slot"
const DB_NAME = 'dietdiary-photos';
const STORE = 'photos';
let dbp;
const urlCache = new Map();

function db() {
  dbp ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const photoKey = (date, slot) => `${date}|${slot}`;

export async function putPhoto(key, blob) {
  await tx('readwrite', (s) => s.put(blob, key));
  revoke(key);
}

export async function getPhoto(key) {
  return tx('readonly', (s) => s.get(key));
}

export async function delPhoto(key) {
  await tx('readwrite', (s) => s.delete(key));
  revoke(key);
}

export async function clearPhotos() {
  await tx('readwrite', (s) => s.clear());
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
}

function revoke(key) {
  const u = urlCache.get(key);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(key);
}

export async function photoURL(key) {
  if (urlCache.has(key)) return urlCache.get(key);
  const blob = await getPhoto(key);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urlCache.set(key, u);
  return u;
}

/** 화면 안의 <img data-photo="key"> 들을 채움 */
export function hydratePhotos(root) {
  root.querySelectorAll('img[data-photo]').forEach(async (img) => {
    try {
      const u = await photoURL(img.dataset.photo);
      if (u) img.src = u;
      else img.closest('.photo-box')?.classList.add('missing');
    } catch {
      /* 무시 */
    }
  });
}

/** 큰 사진을 최대 1080px JPEG 로 줄여 저장 공간 절약 */
export function compressImage(file, max = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('압축 실패'))), 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없어요'));
    };
    img.src = url;
  });
}

const blobToDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export async function exportPhotos() {
  const d = await db();
  const out = {};
  await new Promise((resolve, reject) => {
    const t = d.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).openCursor();
    const pending = [];
    req.onsuccess = () => {
      const c = req.result;
      if (c) {
        const key = c.key;
        pending.push(blobToDataURL(c.value).then((u) => (out[key] = u)));
        c.continue();
      } else Promise.all(pending).then(resolve, reject);
    };
    req.onerror = () => reject(req.error);
  });
  return out;
}

export async function importPhotos(map) {
  for (const [key, dataURL] of Object.entries(map || {})) {
    const blob = await (await fetch(dataURL)).blob();
    await putPhoto(key, blob);
  }
}
