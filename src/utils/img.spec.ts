import {createCanvasForHtml, downloadBase64Img} from './img';

describe('img', () => {
  const validImageUrl =
    'https://fastly.picsum.photos/id/622/200/200.jpg?hmac=0opC4wvaKSUqImE8atOt5HC8k6S4bXipDuItdfzK9s4';

  beforeEach(() => {
    const fakeImageData = new Uint8Array([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    ]);
    const fakeImageBlob = new Blob([fakeImageData.buffer], {type: 'image/png'});

    spyOn(window, 'fetch').and.callFake(url => {
      if (url === validImageUrl) {
        const response = new Response(fakeImageBlob, {
          status: 200,
          headers: {'Content-Type': 'image/png'},
        });
        return Promise.resolve(response);
      } else {
        return Promise.reject(new TypeError('Failed to fetch'));
      }
    });
  });

  it('downloadBase64Img: should return a base64 string or ArrayBuffer when given a valid image URL', async () => {
    const imageData = await downloadBase64Img(validImageUrl);
    const isBase64 = typeof imageData === 'string' && /^data:image\/\w+;base64,/.test(imageData);
    const isArrayBuffer = imageData instanceof ArrayBuffer;

    expect(isBase64 || isArrayBuffer).toBe(true);
  });

  it('downloadBase64Img: should return an empty string when given an invalid image URL', async () => {
    const invalidImageUrl = 'https://invalid-url.com/invalid-image.jpg';
    try {
      const imageData = await downloadBase64Img(invalidImageUrl);
      expect(imageData).toBe('');
    } catch (error) {
      expect(error).toBeTruthy();
    }
  });

  it('createCanvasForHtml: should return an HTMLImageElement when given an HTML string and size', async () => {
    const html = '<h1>Hello, world!</h1>';
    const size = 200;

    spyOn(window.URL, 'createObjectURL').and.callFake(blob => {
      return 'blob:' + '1234567890';
    });

    spyOn(window.URL, 'revokeObjectURL');

    const canvasImage = await createCanvasForHtml(html, size);

    try {
      canvasImage.dispatchEvent(new Event('load')); // Manually trigger the load event
      expect(canvasImage instanceof HTMLImageElement).toBe(true);
      expect(canvasImage.src).toContain('blob:');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
    } catch (error) {
      fail(error);
    }
  }, 10000);
});
