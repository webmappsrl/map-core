import {bufferToString, prefix, stringToUint8Array} from './localStorage';

export function loadFeaturesXhr(
  url,
  format,
  extent,
  resolution,
  projection,
  success,
  failure,
): void {
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
    // status will be 0 for file:// urls
    if (!xhr.status || (xhr.status >= 200 && xhr.status < 300)) {
      var type = format.getType();
      /** @type {Document|Node|Object|string|undefined} */
      var source = void 0;
      if (type == 'json' || type == 'text') {
        source = xhr.responseText;
      } else if (type == 'xml') {
        source = xhr.responseXML;
        if (!source) {
          source = new DOMParser().parseFromString(xhr.responseText, 'application/xml');
        }
      } else if (type == 'arraybuffer') {
        source = xhr.response;
        let resp = null;
        try {
          resp = bufferToString(xhr.response);
        } catch (e) {
          console.log(e);
        }
        if (resp != null) {
          try {
            localStorage.setItem(`${prefix}_${url}`, resp);
          } catch (e) {
            // console.warn(e);
            resp = null;
          }
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
  let cached = null;
  const storageUrl = `${prefix}_${url}`;
  try {
    cached =
      localStorage.getItem(storageUrl) != null
        ? stringToUint8Array(localStorage.getItem(storageUrl))
        : null;
  } catch (e) {
    console.log(e);
  }
  if (cached != null) {
    success(
      format.readFeatures(cached, {
        extent: extent,
        featureProjection: projection,
      }),
      format.readProjection(cached),
    );
  } else {
    const body = `{
        "query": {"term" : { "layers" : 133 }}
    }`;
    xhr.send(body);
  }
}
