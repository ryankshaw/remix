// all this ceremony is to get `window.crypto` in a browser or platform that has it and `crypto.webcrypto` in Node
const globals: { crypto?: Crypto; msCrypto?: Crypto } = (
  typeof window !== "undefined"
    ? window
    : typeof self !== "undefined"
    ? self
    : null
) as any;
const globalCrypto = globals && (globals.crypto || globals.msCrypto);

let webCrypto: Promise<any> = Promise.resolve(globalCrypto)
if (!globalCrypto) {
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    let nodeCrypto: Promise<typeof import("crypto")>;
    nodeCrypto = new Function('return import("crypto")')();
    webCrypto = nodeCrypto.then(c => c.webcrypto);
  } catch (_error) {}
}

export async function hexdigest(buffer: any) {
  let crypto = await webCrypto;
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
  return hashHex;
}
