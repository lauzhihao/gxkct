import CryptoJS from 'crypto-js'

// 加密盐值，与Vue组件保持一致
const SALT = '***#17600620312#'

/**
 * 加密密码
 * @param password 原始密码
 * @returns 加密后的密码
 */
export function encryptPassword(password: string): string {
  const key = CryptoJS.enc.Utf8.parse(SALT)
  const iv = CryptoJS.enc.Utf8.parse(SALT.slice(0, 16))
  const encrypted = CryptoJS.AES.encrypt(password, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return encrypted.toString()
}

/**
 * 解密密码
 * @param encryptedPassword 加密后的密码
 * @returns 解密后的密码
 */
export function decryptPassword(encryptedPassword: string): string {
  const key = CryptoJS.enc.Utf8.parse(SALT)
  const iv = CryptoJS.enc.Utf8.parse(SALT.slice(0, 16))
  const decrypted = CryptoJS.AES.decrypt(encryptedPassword, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })
  return decrypted.toString(CryptoJS.enc.Utf8)
}

