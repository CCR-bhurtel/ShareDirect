import { useCallback } from "react";

export function useFileEncryption() {
  // Generate a key from password using PBKFD2
  const deriveKey = useCallback(
    async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);

      // Importing the password buffer as a key
      const baseKey = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        "PBKDF2",
        false,
        ["deriveKey"]
      );

      return window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
    },
    []
  );

  // Creating a challenge for password verification
  //   const generateChallenge = useCallback(
  //     async (
  //       password: string
  //     ): Promise<{ salt: Uint8Array; encryptedSalt: Uint8Array }> => {
  //       const salt = window.crypto.getRandomValues(new Uint8Array(16));
  //       const iv = window.crypto.getRandomValues(new Uint8Array(12));

  //       // create a key from the password
  //       const key = await deriveKey(password, salt);

  //       // Create a challenge message
  //       const message = "VERIFIED_" + Date.now();
  //     }
  //   );
}
