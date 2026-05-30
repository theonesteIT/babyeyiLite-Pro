/**
 * Generate MVEND X-PIN, X-NOUNCE, and RSA-encrypted session_key.
 * JavaScript equivalent of the Python PyNaCl + cryptography script.
 *
 * Usage:
 *   npm install
 *   node generate-mvend-credentials.mjs [PIN]
 *
 * Example:
 *   node generate-mvend-credentials.mjs 24272
 */

import { randomBytes, publicEncrypt, constants } from "node:crypto";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAuJDZmDZQWtGb+B/UVBqU
IGJ2YSHphyd/R2Zx3RAyKaizpqhol3n2PChMxDpgeaTICqJKceBjFR+Usz4UQA38
obcwMt+fkw0KgEkbmu8g+3u9ZOo8QfKm0Ci0IL+tNuiY7hNBda5RKRRHYm9NyhE2
xDtoOsvoumF4GrS0tNJNSz6plKMXv1SE6V1tBeeJMEiroKvKPGj/pNzQhE0ylf+L
1Yvol2xCglMS9w4OfUdxb7H4MUyXZ2AmrQN9REbABDXPA9fIud+Tvq/HJoUymxJH
2J+/SAvyZxDcPvM5EM3xq+nOmAFmVEu8pCv5+gB/nS9EQ2eqW8ExYZTigfUADxAl
mkTqWCgiXyvJuGCB32lNP1uRnDSvHKJTbghiVZZ6uj3JqcatpRXbACC0LwIa8rAi
TYbXH+0yeyCS5G4MGDBba7WN8XeubJsrEjrUkIBqPR3CHXfy5gIYCuzmmlVF9T9e
yHk2R7+QU8zBNffugDeXYQJFMA8TIdfLC4d1JxWzbegrAgMBAAE=
-----END PUBLIC KEY-----`;

const XCHACHA_NONCE_BYTES = 24;

function encryptXChaCha20Poly1305(keyB64, plaintext) {
  const key = Buffer.from(keyB64, "base64");
  const nonce = randomBytes(XCHACHA_NONCE_BYTES);
  const message = Buffer.from(plaintext, "utf-8");

  const ciphertext = xchacha20poly1305(key, nonce).encrypt(message);

  return {
    nonceB64: nonce.toString("base64"),
    ciphertextB64: Buffer.from(ciphertext).toString("base64"),
  };
}

function main() {
  const pin = process.argv[2] || "24272";

  const keyBytes = randomBytes(32);
  const keyB64 = keyBytes.toString("base64");

  const encryptedKey = publicEncrypt(
    {
      key: PUBLIC_KEY,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(keyB64, "utf-8")
  );

  const encryptedKeyB64 = encryptedKey.toString("base64");
  const encryptedPin = encryptXChaCha20Poly1305(keyB64, pin);

  const result = {
    message: "Encrypted PIN (base64)",
    pin: {
      "X-PIN": encryptedPin.ciphertextB64,
      "X-NOUNCE": encryptedPin.nonceB64,
    },
    base64_key: {
      session_key: encryptedKeyB64,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
