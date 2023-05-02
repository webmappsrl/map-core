import {stringToUint8Array} from './httpRequest';

describe('httpRequest', () => {
  it('stringToUint8Array: should convert a string to a Uint8Array', () => {
    const inputString = 'Hello, world!';
    const expectedUint8Array = new Uint8Array([
      72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100, 33,
    ]);

    const result = stringToUint8Array(inputString);

    expect(result).toEqual(expectedUint8Array);
  });

  it('stringToUint8Array: should return an empty Uint8Array for an empty string', () => {
    const inputString = '';
    const expectedUint8Array = new Uint8Array([]);

    const result = stringToUint8Array(inputString);

    expect(result).toEqual(expectedUint8Array);
  });
});
