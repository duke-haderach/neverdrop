/**
 * keystore.js
 * Stores API keys in the OS native keychain:
 *   - macOS: Keychain
 *   - Windows: Credential Vault
 *   - Linux: libsecret / KWallet
 *
 * Falls back to encrypted file store if keytar is unavailable
 * (e.g. in CI or sandboxed environments).
 */

const SERVICE = 'NeverDrop';
let keytar;

try {
  keytar = require('keytar');
} catch (e) {
  console.warn('[keystore] keytar not available, falling back to encrypted file store');
  keytar = null;
}

// Fallback: encrypted in-memory + file store using electron-store
let fallbackStore;
function getFallbackStore() {
  if (!fallbackStore) {
    const Store = require('electron-store');
    fallbackStore = new Store({
      name: 'keystore',
      encryptionKey: 'nd_keystore_v1', // basic obfuscation for fallback only
    });
  }
  return fallbackStore;
}

async function setKey(providerId, apiKey) {
  if (keytar) {
    await keytar.setPassword(SERVICE, providerId, apiKey);
  } else {
    getFallbackStore().set(`key_${providerId}`, apiKey);
  }
}

async function getKey(providerId) {
  if (keytar) {
    return keytar.getPassword(SERVICE, providerId);
  } else {
    return getFallbackStore().get(`key_${providerId}`, null);
  }
}

async function deleteKey(providerId) {
  if (keytar) {
    await keytar.deletePassword(SERVICE, providerId);
  } else {
    getFallbackStore().delete(`key_${providerId}`);
  }
}

module.exports = { setKey, getKey, deleteKey };
