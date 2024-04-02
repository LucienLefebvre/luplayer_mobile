import { Filesystem, Directory } from '@capacitor/filesystem';

onmessage = async function (e) {
  const { path, directory, data } = e.data;

  await appendDataToFile(path, directory, data);
};

async function appendDataToFile(path: string, directory: string, data: Blob) {
  try {
    const bufferStart = performance.now();
    const buffer = await data.arrayBuffer();
    const base64 = array_buffer_to_base64(buffer);
    const bufferEnd = performance.now();
    //console.log('buffer', bufferEnd - bufferStart);
    const writeStart = performance.now();
    await Filesystem.appendFile({
      path: path,
      data: base64,
      directory: directory as Directory,
    });
    const writeEnd = performance.now();
    //console.log('write', writeEnd - writeStart);
  } catch (error) {
    console.error('appendDataToFile', error);
  }
}

function array_buffer_to_base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(binary);
  let base64 = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < data.length; i += 3) {
    base64 += characters[data[i] >> 2];
    base64 += characters[((data[i] & 3) << 4) | (data[i + 1] >> 4)];
    base64 += characters[((data[i + 1] & 15) << 2) | (data[i + 2] >> 6)];
    base64 += characters[data[i + 2] & 63];
  }
  return base64;
}
