// Helper method to convert a string to an ArrayBuffer
export const str2ab = (str: string) => {
  const buf = new ArrayBuffer(str.length);

  // a buffer view is a typed array that can be
  // used to read and write data to the buffer
  const bufView = new Uint8Array(buf);

  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

// Helper method to convert ArrayBuffer to string
export const ab2str = (buf: ArrayBuffer) => {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
};
