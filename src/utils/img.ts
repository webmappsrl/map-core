/**
 * @description
 * Downloads an image from a URL and returns the image data as a base64 string or ArrayBuffer.
 * This function downloads an image from a given URL and returns the image data as a base64 string or ArrayBuffer.
 * It uses the fetch API to retrieve the image data and a FileReader object to convert the data to a base64 string or ArrayBuffer.
 * The function returns a Promise that resolves to the base64 string or ArrayBuffer of the downloaded image data.
 *
 * @param url - The URL of the image to download.
 * @returns A Promise that resolves to a base64 string or ArrayBuffer of the downloaded image data.
 *
 * @example
 * const url = 'https://example.com/image.jpg';
 * const imageData = await downloadBase64Img(url);
 * // imageData will contain the base64 string or ArrayBuffer of the downloaded image data.
 */
export async function downloadBase64Img(url): Promise<string | ArrayBuffer> {
  const opt = {};
  const data = await fetch(url, opt);
  const blob = await data.blob();
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    try {
      reader.onloadend = () => {
        const base64data = reader.result;
        resolve(base64data);
      };
    } catch (error) {
      resolve('');
    }
  });
}

/**
 * @description
 * Creates an HTML canvas element from the given HTML string and size.
 * This function creates an HTML canvas element from the given HTML string and size using an SVG foreignObject. It returns a Promise that resolves to an HTMLImageElement of the created canvas. The function uses the createObjectURL() method of the window.URL object to create a URL for the SVG, which is then used as the source for the canvas image.
 *
 * @param html - The HTML string to convert to an image.
 * @param size - The size of the canvas in pixels.
 * @returns A Promise that resolves to an HTMLImageElement of the created canvas.
 *
 * @example
 * const html = '<h1>Hello, world!</h1>';
 * const size = 200;
 * const canvasImage = await createCanvasForHtml(html, size);
 * // canvasImage will contain an HTMLImageElement of the created canvas.
 */
export async function createCanvasForHtml(html: string, size: number): Promise<HTMLImageElement> {
  const canvasHtml =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    '<foreignObject width="100%" height="100%">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:40px">' +
    html +
    '</div>' +
    '</foreignObject>' +
    '</svg>';

  const domUrl = window.URL; // || window.webkitURL || window;

  const img = new Image();
  const svg = new Blob([canvasHtml], {
    type: 'image/svg+xml', //;charset=utf-8',
  });
  const url = domUrl.createObjectURL(svg);

  img.onload = () => {
    domUrl.revokeObjectURL(url);
  };
  img.src = url;

  return img;
}
