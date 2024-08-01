import {GeoJsonProperties} from 'geojson';
import * as localforage from 'localforage';
import {downloadFile, isValidUrl} from './httpRequest';
import {getTilesByGeometry} from '.';
import {GeoJSONFeature} from 'ol/format/GeoJSON';

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

export async function downloadTrack(
  trackid: string,
  track: GeoJSONFeature,
  callBackStatusFn = updateStatus,
): Promise<number> {
  let totalSize = 0;
  const status = {finish: false, map: 0, media: 0, data: 0};
  const tiles = getTilesByGeometry(track.geometry);
  totalSize += await downloadTiles(tiles, trackid, callBackStatusFn);
  totalSize += await saveTrack(trackid, track, callBackStatusFn);
  track.properties.size = totalSize;
  await saveTrack(trackid, track, callBackStatusFn);
  return Promise.resolve(totalSize);
}

export function findImgInsideProperties(
  properties: GeoJsonProperties,
  excludeFolders = ['Resize'],
): string[] {
  let urls: string[] = [];

  function recurse(o: any) {
    if (typeof o === 'object' && o !== null) {
      for (const key in o) {
        if (o.hasOwnProperty(key)) {
          const value = o[key];
          if (typeof value === 'string' && isImageUrl(value) && !containsExcludedFolder(value)) {
            urls.push(value);
          } else if (typeof value === 'object') {
            recurse(value);
          }
        }
      }
    }
  }

  function isImageUrl(url: string): boolean {
    const imagePattern = /\.(jpeg|jpg|gif|png|svg|webp)$/i;
    const urlPattern = /^(https?:\/\/)?([^\s$.?#].[^\s]*)$/i;
    return imagePattern.test(url.toLowerCase()) && urlPattern.test(url);
  }
  function containsExcludedFolder(url: string): boolean {
    for (const folder of excludeFolders) {
      if (url.includes(folder)) {
        return true;
      }
    }
    return false;
  }
  recurse(properties);
  return urls;
}

export async function getImgTrack(url: string): Promise<ArrayBuffer | null> {
  try {
    const asd = await imgTrackLocalForage.getItem<ArrayBuffer>(url);
    return asd;
  } catch (error) {
    console.error('Failed to get img track:', error);
    return null;
  }
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

export async function getTrack(trackId: string): Promise<GeoJSONFeature> {
  try {
    return await trackLocalForage.getItem<GeoJSONFeature>(trackId);
  } catch (error) {
    console.error('Failed to get track:', error);
    return null;
  }
}

export async function getTracks(): Promise<GeoJSONFeature[]> {
  try {
    const keys = await trackLocalForage.keys();
    return Promise.all(keys.map(key => getTrack(key)));
  } catch (error) {
    console.error('Failed to get tracks:', error);
    return [];
  }
}

export async function removeImgInsideTrack(track: GeoJSONFeature): Promise<void> {
  const properties = track.properties;
  if (properties == null) return;
  const urls = findImgInsideProperties(properties) || [];
  if (urls == null || urls.length === 0) return;
  urls.forEach(async url => {
    await removeImgTrack(url);
  });
}

export async function removeImgTrack(url: string): Promise<void> {
  try {
    await imgTrackLocalForage.removeItem(url);
  } catch (error) {
    console.error('Failed to remove img:', error);
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

export async function removeTrack(trackId: string): Promise<void> {
  try {
    const track = await getTrack(trackId);
    if (track != null) {
      await removeImgInsideTrack(track);
      const tiles = getTilesByGeometry(track.geometry);
      await removeTiles(tiles, trackId);
    }

    await trackLocalForage.removeItem(trackId);
  } catch (error) {
    console.error('Failed to remove track:', error);
  }
}

export async function saveImgInsideTrack(
  track: GeoJSONFeature,
  callBackStatusFn = updateStatus,
): Promise<number> {
  const properties = track.properties;
  let totalSize = 0;
  if (properties == null) {
    callBackStatusFn({
      finish: false,
      media: 1,
    });
    return Promise.resolve(totalSize);
  }
  const urls = findImgInsideProperties(properties) || [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const d = await downloadFile(url);
    totalSize += (d && d.byteLength) ?? 0;
    await saveImgTrack(url, d);
    callBackStatusFn({
      finish: false,
      media: (i + 1) / urls.length,
    });
  }
  return Promise.resolve(totalSize);
}

export function saveImgTrack(url: string, value: ArrayBuffer | null): void {
  if (value == null) return;
  if (isValidUrl(url) === false) return;
  imgTrackLocalForage.setItem(url, value);
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

export async function saveTrack(
  trackId: string,
  track: GeoJSONFeature,
  callBackStatusFn = updateStatus,
): Promise<number> {
  let totalSize = 0;
  totalSize += await saveImgInsideTrack(track, callBackStatusFn);
  trackLocalForage.setItem(trackId, track);

  return Promise.resolve(totalSize);
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
  name: 'wm-tiles',
  storeName: 'tiles',
});
export const tileHandlerLocalForage = localforage.createInstance({
  name: 'wm-tiles',
  storeName: 'handler',
});
export const pbfLocalForage = localforage.createInstance({
  name: 'wm-tiles',
  storeName: 'pbf',
});
export const trackLocalForage = localforage.createInstance({
  name: 'wm-tracks',
  storeName: 'tracks',
});
export const imgTrackLocalForage = localforage.createInstance({
  name: 'wm-tracks',
  storeName: 'img',
});
