import * as localforage from 'localforage';

/**
 * @description
 * Loads features from a given URL and processes the data using a specified format.
 * In case of successful data retrieval, it calls the `success` callback function.
 * In case of failure, it calls the `failure` callback function.
 * It also supports caching features using `cachedStringed` parameter.
 *
 * @param url {string | URL} - The URL to request features from.
 * @param format {Object} - The format object containing methods to read features and projection.
 * @param extent {*} - The extent of the requested features.
 * @param resolution {*} - The resolution of the requested features.
 * @param projection {*} - The projection of the requested features.
 * @param success {Function} - The callback function called upon successful retrieval of features.
 * @param failure {Function} - The callback function called upon failure in retrieving features.
 * @param cachedStringed {string} - The cached string representation of features to be used if available.
 *
 * @example
 *
 * loadFeaturesXhr(
 *   'https://example.com/features',
 *   format,
 *   extent,
 *   resolution,
 *   projection,
 *   (features, projection) => { console.log('Success:', features, projection); },
 *   () => { console.error('Failed to load features.'); },
 *   cachedFeatures,
 * );
 */
export function loadFeaturesXhr(
  url: string | URL,
  format: {
    readFeatures: (arg0: Uint8Array, arg1: {extent: any; featureProjection: any}) => any;
    readProjection: (arg0: Uint8Array) => any;
  },
  extent: any,
  resolution: any,
  projection: any,
  success: (arg0: any, arg1: any) => void,
  failure: any,
  cachedStringed: string,
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
    xhr.open('POST', url as string, true);
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
            cacheSetUrl(url as string, resp);
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

/**
 * @description
 * Caches the value of a given URL in local storage or localforage, depending on the URL.
 * If the URL contains the string 'low', it attempts to store the value in local storage first.
 * If it fails or the URL doesn't contain 'low', it stores the value in localforage.
 *
 * @param url {string} - The URL for which the value will be cached.
 * @param value {string} - The value to be cached for the given URL.
 *
 * @example
 *
 * const url = 'https://example.com/data';
 * const value = 'Sample data content';
 *
 * cacheSetUrl(url, value);
 */
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

/**
 * @description
 * Converts a string to a Uint8Array.
 *
 * @param str {string} - The string to be converted to a Uint8Array.
 * @returns {Uint8Array} - The resulting Uint8Array representation of the input string.
 *
 * @example
 *
 * const inputString = 'Hello, world!';
 * const uint8Array = stringToUint8Array(inputString);
 *
 * // uint8Array: [72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33]
 */
export function stringToUint8Array(str: string): Uint8Array {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

/**
 * Clears the storage by removing all items with a key containing 'geohub'
 * in the localStorage and clearing the entire localforage storage.
 *
 * Usage example:
 *
 * clearStorage();
 */
export function clearStorage(): void {
  const allGeohubStorageKeys = Object.keys(localStorage).filter(f => f.indexOf('geohub') >= 0);
  allGeohubStorageKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  localforage.clear();
}
