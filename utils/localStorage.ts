import * as localforage from 'localforage';

export const prefix = 'JIDO';
export function bufferToString(buf: Uint8Array | ArrayBuffer): string | null {
  try {
    let stringedBinary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
      stringedBinary += String.fromCharCode(bytes[i]);
    }
    return stringedBinary;
  } catch (e) {
    return null;
  }
}
export function stringToUint8Array(str: string): Uint8Array {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

export function clearStorage(): void {
  const allGeohubStorageKeys = Object.keys(localStorage).filter(f => f.indexOf(prefix) >= 0);
  allGeohubStorageKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  localforage.clear();
}
