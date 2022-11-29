import * as localforage from 'localforage';
export function loadFeaturesXhr(
  url,
  format,
  extent,
  resolution,
  projection,
  success,
  failure,
  cachedStringed,
): void {
  let cached = null;
  if (cachedStringed != null) {
    try {
      cached = cachedStringed != null ? stringToUint8Array(cachedStringed) : null;
      if (cached != null) {
        // console.log('restored by cache: ', url);
        success(
          format.readFeatures(cached, {
            extent: extent,
            featureProjection: projection,
          }),
          format.readProjection(cached),
        );
      }
    } catch (e) {
      console.log(e);
      cached = null;
    }
  }
  if (cached == null) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function () {
      if (!xhr.status || (xhr.status >= 200 && xhr.status < 300)) {
        let source = xhr.response;
        let resp = null;
        try {
          resp = bufferToString(source);
        } catch (e) {
          console.log(e);
        }
        if (resp != null) {
          try {
            cacheSetUrl(url, resp);
          } catch (e) {
            console.warn(e);
            resp = null;
          }
        }
        if (source) {
          // endTime(url, 'by http');

          success(
            format.readFeatures(source, {
              extent: extent,
              featureProjection: projection,
            }),
            format.readProjection(source),
          );
        } else {
          failure();
        }
      } else {
        failure();
      }
    };
    /**
     * @private
     */
    xhr.onerror = failure;
    xhr.send();
  }
}
export function cacheSetUrl(url: string, value: string): void {
  if (url.search('low') > -1) {
    try {
      localStorage.setItem(url, value);
    } catch (e) {
      localforage.setItem(url, value);
      // console.warn('local storage failed: ', url);
    }
  } else {
    localforage.setItem(url, value);
  }
}
export function bufferToString(buf: Uint8Array | ArrayBuffer): string | null {
  try {
    let stringedBinary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
      stringedBinary += String.fromCharCode(bytes[i]);
    }
    return stringedBinary;
  } catch (e) {
    console.warn(e);
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
  const allGeohubStorageKeys = Object.keys(localStorage).filter(f => f.indexOf('geohub') >= 0);
  allGeohubStorageKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  localforage.clear();
}
