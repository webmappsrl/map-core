import {bufferToString, stringToUint8Array} from './localStorage';
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
        // console.log(url, 'cached');
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
      cachedStringed = null;
    }
  }
  if (cached == null) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', typeof url === 'function' ? url(extent, resolution, projection) : url, true);
    if (format.getType() == 'arraybuffer') {
      xhr.responseType = 'arraybuffer';
    }
    /**
     * @param {Event} event Event.
     * @private
     */
    xhr.onload = function (event) {
      // console.log('ON LOAD: ', url);
      // status will be 0 for file:// urls
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
            localforage.setItem(url, resp);
            // console.log('saved in cache');
          } catch (e) {
            console.warn(e);
            // console.log('error in cache');
            resp = null;
          }
        }
        if (source) {
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

    // console.log('SEND REQUEST: ', url);
    xhr.send();
  }
}
