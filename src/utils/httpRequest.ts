import * as localforage from 'localforage';

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
  localforage.setItem(url, value);
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
  localforage.clear();
}

export async function downloadFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.arrayBuffer();
}

/**
 * @description
 * Downloads and stores MBTiles for the given tile IDs.
 *
 * @param {string[]} tilesIDs - An array of tile IDs to be downloaded.
 * @returns {Promise<number>} - The total size of downloaded tiles in bytes.
 */
export async function downloadTiles(
  tilesIDs: string[],
  prefix: number | string | undefined = undefined,
  callBackStatusFn = updateStatus,
): Promise<number> {
  if (!tilesIDs || tilesIDs.length === 0) {
    callBackStatusFn({
      finish: false,
      map: 1,
    });
    return 0;
  }

  let totalSize = 0;

  for (let i = 0; i < tilesIDs.length; i++) {
    const tilesId = `${tilesIDs[i]}`;

    const existingTile = await getTile(tilesId);
    if (!existingTile) {
      try {
        let tileData: ArrayBuffer;
        const wmTilesAPI = `https://api.webmapp.it/tiles/${tilesId}.png`;

        try {
          tileData = await downloadFile(wmTilesAPI);
          if (tileData.byteLength === 0) {
            console.error(wmTilesAPI);
            throw new Error('Tile data is empty');
          }
        } catch (err) {
          console.log('Failed to download from Webmapp API', tilesId);
          throw err;
        }

        totalSize += tileData.byteLength;
        await saveTile(tilesId, tileData, prefix);
      } catch (err) {}
    } else {
      updateTileHandlerLocalForage(tilesId, prefix);
    }
    callBackStatusFn({
      finish: false,
      map: 1 / tilesIDs.length,
    });
  }

  return totalSize;
}

export async function getTile(tileId: string): Promise<ArrayBuffer | null> {
  try {
    return await tileLocalForage.getItem<ArrayBuffer>(tileId);
  } catch (error) {
    console.error('Failed to get tile:', error);
    return null;
  }
}

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
    xhr.open('GET', url as string, true);
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

export async function removeTiles(tilesIDS: string[], prefix?: number | string): Promise<void> {
  for (let i = 0; i < tilesIDS.length; i++) {
    await removeTile(tilesIDS[i], prefix);
  }
}

export async function removeTile(tileId: string, prefix?: number | string): Promise<void> {
  try {
    if (prefix) {
      const currentPrefix = ((await tileHandlerLocalForage.getItem(tileId)) as any[]) || [];
      const index = currentPrefix.indexOf(prefix);
      if (index > -1) {
        currentPrefix.splice(index, 1);
        if (currentPrefix.length <= 0) {
          await tileLocalForage.removeItem(tileId);
          await tileHandlerLocalForage.removeItem(tileId);
        } else {
          await tileHandlerLocalForage.setItem(tileId, currentPrefix);
        }
      }
    } else {
      await tileLocalForage.removeItem(tileId);
    }
  } catch (error) {
    console.error('Failed to remove tile:', error);
  }
}

// Funzioni per la gestione delle tile
export async function saveTile(
  tileId: string,
  tileData: ArrayBuffer,
  prefix?: string | number,
): Promise<void> {
  try {
    await tileLocalForage.setItem(tileId, tileData);
    if (prefix) {
      updateTileHandlerLocalForage(tileId, prefix);
    }
  } catch (error) {
    console.error('Failed to save tile:', error);
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

export function updateStatus(status: {finish: boolean; map: number}) {
  console.log('Status update:', status);
}

export async function updateTileHandlerLocalForage(tileId, prefix) {
  try {
    const currentPrefix = ((await tileHandlerLocalForage.getItem(tileId)) as any[]) || [];
    currentPrefix.push(prefix);
    await tileHandlerLocalForage.setItem(tileId, currentPrefix);
  } catch (error) {
    console.error('Failed to update tile handler:', error);
  }
}

export const tileLocalForage = localforage.createInstance({
  name: 'wm-tiles',
  storeName: 'tiles',
});
export const tileHandlerLocalForage = localforage.createInstance({
  name: 'wm-tiles',
  storeName: 'handler',
});
