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
