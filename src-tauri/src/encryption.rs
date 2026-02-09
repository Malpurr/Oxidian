use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use argon2::Argon2;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};

const SALT_LEN: usize = 32;
const NONCE_LEN: usize = 12;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EncryptedData {
    pub salt: String,   // base64
    pub nonce: String,  // base64
    pub data: String,   // base64
}

/// Derive a 256-bit key from a password using Argon2id
fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Key derivation failed: {}", e))?;
    Ok(key)
}

/// Encrypt plaintext with a password. Returns EncryptedData with salt+nonce+ciphertext.
pub fn encrypt(plaintext: &[u8], password: &str) -> Result<EncryptedData, String> {
    let mut salt = [0u8; SALT_LEN];
    OsRng.fill_bytes(&mut salt);

    let key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Cipher init failed: {}", e))?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    Ok(EncryptedData {
        salt: B64.encode(salt),
        nonce: B64.encode(nonce_bytes),
        data: B64.encode(ciphertext),
    })
}

/// Decrypt EncryptedData with a password.
pub fn decrypt(encrypted: &EncryptedData, password: &str) -> Result<Vec<u8>, String> {
    let salt = B64.decode(&encrypted.salt)
        .map_err(|e| format!("Invalid salt: {}", e))?;
    let nonce_bytes = B64.decode(&encrypted.nonce)
        .map_err(|e| format!("Invalid nonce: {}", e))?;
    let ciphertext = B64.decode(&encrypted.data)
        .map_err(|e| format!("Invalid data: {}", e))?;

    let key = derive_key(password, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Cipher init failed: {}", e))?;

    let nonce = Nonce::from_slice(&nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| "Decryption failed: wrong password or corrupted data".to_string())
}

/// Encrypt a file's content and return JSON string of EncryptedData
pub fn encrypt_file_content(content: &str, password: &str) -> Result<String, String> {
    let encrypted = encrypt(content.as_bytes(), password)?;
    serde_json::to_string(&encrypted).map_err(|e| format!("Serialization failed: {}", e))
}

/// Decrypt a JSON string of EncryptedData and return plaintext
pub fn decrypt_file_content(encrypted_json: &str, password: &str) -> Result<String, String> {
    let encrypted: EncryptedData = serde_json::from_str(encrypted_json)
        .map_err(|e| format!("Invalid encrypted data: {}", e))?;
    let plaintext = decrypt(&encrypted, password)?;
    String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))
}

/// Verify a password against encrypted data (try to decrypt)
pub fn verify_password(encrypted_json: &str, password: &str) -> bool {
    decrypt_file_content(encrypted_json, password).is_ok()
}
