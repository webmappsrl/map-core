import * as localforage from 'localforage';
import {downloadFile} from './httpRequest';

/**
 * Clears the storage by removing all items with a key containing 'geohub'
 * in the localStorage and clearing the entire localforage storage.
 *
 * Usage example:
 *
 * clearPbfDB();
 */
export function clearPbfDB(): void {
  pbfLocalForage.clear();
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
      map: (i + 1) / tilesIDs.length,
    });
  }

  return totalSize;
}

export async function getPbf(url: string): Promise<string | null> {
  try {
    return await pbfLocalForage.getItem<string>(url);
  } catch (error) {
    console.error('Failed to get pbf:', error);
    return null;
  }
}

export async function getTile(tileId: string): Promise<ArrayBuffer | null> {
  try {
    return await tileLocalForage.getItem<ArrayBuffer>(tileId);
  } catch (error) {
    console.error('Failed to get tile:', error);
    return null;
  }
}

export async function removePbf(url: string): Promise<void> {
  try {
    await pbfLocalForage.removeItem(url);
  } catch (error) {
    console.error('Failed to remove pbf:', error);
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

export async function removeTiles(tilesIDS: string[], prefix?: number | string): Promise<void> {
  for (let i = 0; i < tilesIDS.length; i++) {
    await removeTile(tilesIDS[i], prefix);
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
 * savePbf(url, value);
 */
export function savePbf(url: string, value: string): void {
  pbfLocalForage.setItem(url, value);
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

export function updateStatus(status: {
  finish: boolean;
  map?: number;
  media?: number;
  data?: number;
}): void {
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
  name: 'map-core',
  storeName: 'tiles',
});
export const tileHandlerLocalForage = localforage.createInstance({
  name: 'map-core',
  storeName: 'handler',
});
export const pbfLocalForage = localforage.createInstance({
  name: 'map-core',
  storeName: 'pbf',
});
