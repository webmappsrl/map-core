import * as localforage from 'localforage';
import {downloadFile} from './httpRequest';
import {WmFeature, WmFeatureCollection} from '@wm-types/feature';
import {getTilesByGeometry} from './ol';
import {MultiPolygon} from 'geojson';
import {
  GET_TILES_BY_GEOMETRY_MAX_ZOOM,
  GET_TILES_BY_GEOMETRY_MIN_ZOOM,
} from '@map-core/readonly/constants';
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
export async function getFeatureCollection(url: string): Promise<WmFeatureCollection | null> {
  try {
    const featureCollection = await featureCollectionLocalForage.getItem<WmFeatureCollection>(url);
    if (featureCollection) {
      return featureCollection;
    }
    return await downloadFile(url, 'json');
  } catch (error) {
    console.error('Failed to get feature collection:', error);
    return null;
  }
}
export async function getHitmapFeature(id: string): Promise<WmFeature<MultiPolygon> | null> {
  try {
    const hitmapFeature = await hitMapFeaturesLocalForage.getItem<WmFeature<MultiPolygon>>(id);
    if (hitmapFeature) {
      return hitmapFeature;
    }
    return null;
  } catch (error) {
    console.error('Failed to get hitmap feature collection:', error);
    return null;
  }
}
export async function getHitmapFeatures(): Promise<WmFeature<MultiPolygon>[]> {
  const keys = await hitMapFeaturesLocalForage.keys();
  return keys ? await Promise.all(keys.map(key => getHitmapFeature(key))) : [];
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

export async function downloadTilesByBoundingBox(
  boundingBox: WmFeature<MultiPolygon>,
  overlayXYZ: string = `https://api.webmapp.it/tiles`,
  callBackStatusFn = updateStatus,
): Promise<void> {
  const uuid = generateUUID();
  const geometry = boundingBox.geometry;
  const tiles = getTilesByGeometry(
    geometry,
    GET_TILES_BY_GEOMETRY_MIN_ZOOM,
    GET_TILES_BY_GEOMETRY_MAX_ZOOM,
  );
  const totalTiles = tiles.length;
  let totalSize = 0;

  for (let i = 0; i < totalTiles; i++) {
    const tile = tiles[i];
    const wmTilesAPI = `${overlayXYZ}/${tile}.png`;
    const tileData = await downloadFile(wmTilesAPI);
    totalSize += tileData?.byteLength ?? 0;
    await saveTile(tile, tileData, uuid);
    callBackStatusFn({
      finish: false,
      map: (i + 1) / totalTiles, // percentuale avanzamento
      size: totalSize,
    });
  }

  const boundingBoxWithIdsTiles = {
    ...boundingBox,
    properties: {
      ...boundingBox.properties,
      idsTiles: tiles,
      uuid,
      size: totalSize,
    },
  };
  await saveBoundingBox(boundingBoxWithIdsTiles);

  callBackStatusFn({
    finish: true,
    data: 1,
  });
}

export async function downloadOverlay(
  feature: WmFeature<MultiPolygon>,
  overlayXYZ: string = `https://api.webmapp.it/tiles`,
  callBackStatusFn = updateStatus,
): Promise<void> {
  const properties = feature.properties;
  const id = properties.id;
  const geometry = feature.geometry;
  const overlayUrls: {[url: string]: any} = properties.featureCollections;
  saveHitmapFeature(id, feature);

  const urls = Object.values(overlayUrls);
  const tiles = getTilesByGeometry(
    geometry,
    GET_TILES_BY_GEOMETRY_MIN_ZOOM,
    GET_TILES_BY_GEOMETRY_MAX_ZOOM,
  );

  const totalUrls = urls.length;
  for (let i = 0; i < totalUrls; i++) {
    const url = urls[i];
    await saveFeatureCollection(url, await downloadFile(url, 'json'));
    // Aggiorna la progress bar
    callBackStatusFn({
      finish: false,
      data: (i + 1) / totalUrls, // percentuale avanzamento
    });
  }
  const totalTiles = tiles.length;
  for (let i = 0; i < totalTiles; i++) {
    const tile = tiles[i];
    const wmTilesAPI = `${overlayXYZ}/${tile}.png`;
    const tileData = await downloadFile(wmTilesAPI);
    await saveTile(tile, tileData);
    callBackStatusFn({
      finish: false,
      map: (i + 1) / totalTiles, // percentuale avanzamento
    });
  }

  callBackStatusFn({
    finish: true,
    data: 1,
    map: 1,
  });
}

export async function saveFeatureCollection(
  url: string,
  featureCollection: WmFeatureCollection,
): Promise<void> {
  try {
    await featureCollectionLocalForage.setItem(url, featureCollection);
  } catch (error) {
    console.error('Failed to save feature collection:', error);
  }
}

export async function removeFeatureCollection(url: string): Promise<void> {
  try {
    return await featureCollectionLocalForage.removeItem(url);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function saveHitmapFeature(
  id: string,
  hitMapFeature: WmFeature<MultiPolygon>,
): Promise<void> {
  try {
    await hitMapFeaturesLocalForage.setItem(id, hitMapFeature);
  } catch (error) {
    console.error('Failed to save hitmap feature collection:', error);
  }
}

export async function removeHitmapFeature(id: string): Promise<void> {
  try {
    const currentHitmapFeatures = await getHitmapFeature(id);
    const properties = currentHitmapFeatures?.properties;
    const featureCollections = properties?.featureCollections;
    const featureCollectionKeys = Object.values(featureCollections) as string[];
    for (const featureCollectionKey of featureCollectionKeys) {
      await removeFeatureCollection(featureCollectionKey);
    }
    return await hitMapFeaturesLocalForage.removeItem(id);
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function updateStatus(status: {
  finish: boolean;
  map?: number;
  media?: number;
  data?: number;
  size?: number;
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

export async function saveBoundingBox(boundingBox: WmFeature<MultiPolygon>): Promise<void> {
  try {
    const boundingBoxId = boundingBox.properties.uuid;
    await boundingBoxLocalForage.setItem(boundingBoxId, boundingBox);
  } catch (error) {
    console.error('Failed to save bounding box:', error);
  }
}

export async function deleteBoundingBox(boundingBoxId: string): Promise<void> {
  try {
    const boundingBox = await getBoundingBox(boundingBoxId);
    const properties = boundingBox?.properties;
    const idsTiles = properties?.idsTiles;
    for (const idTile of idsTiles) {
      await removeTile(idTile, boundingBoxId);
    }
    await boundingBoxLocalForage.removeItem(boundingBoxId);
  } catch (error) {
    console.error('Failed to delete bounding box:', error);
  }
}

export async function getBoundingBox(
  boundingBoxId: string,
): Promise<WmFeature<MultiPolygon> | null> {
  try {
    return await boundingBoxLocalForage.getItem<WmFeature<MultiPolygon>>(boundingBoxId);
  } catch (error) {
    console.error('Failed to get bounding box:', error);
    return null;
  }
}

export async function getAllBoundingBoxes(): Promise<WmFeature<MultiPolygon>[]> {
  const keys = await boundingBoxLocalForage.keys();
  return keys ? await Promise.all(keys.map(key => getBoundingBox(key))) : [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function clearMapCoreData(): Promise<void> {
  await Promise.all([
    tileLocalForage.clear(),
    tileHandlerLocalForage.clear(),
    pbfLocalForage.clear(),
    featureCollectionLocalForage.clear(),
    featureCollectionHandlerLocalForage.clear(),
    hitMapFeaturesLocalForage.clear(),
    boundingBoxLocalForage.clear(),
  ]);
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

export const featureCollectionLocalForage = localforage.createInstance({
  name: 'map-core',
  storeName: 'feature-collection',
});

export const featureCollectionHandlerLocalForage = localforage.createInstance({
  name: 'map-core',
  storeName: 'featureCollectionHandler',
});

export const hitMapFeaturesLocalForage = localforage.createInstance({
  name: 'map-core',
  storeName: 'hitmapFeatureCollection',
});

export const boundingBoxLocalForage = localforage.createInstance({
  name: 'map-core',
  storeName: 'boundingBox',
});
