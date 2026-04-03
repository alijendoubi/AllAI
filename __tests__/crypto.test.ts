import { describe, it, expect, beforeAll } from 'vitest'

// Set encryption key before importing the module
beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64) // 32 bytes hex
})

describe('Token encryption', () => {
  it('round-trip: encrypt then decrypt returns original', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/crypto/tokens')
    const original = 'ya29.access_token_example_12345'
    const encrypted = encryptToken(original)
    const decrypted = decryptToken(encrypted)
    expect(decrypted).toBe(original)
  })

  it('produces different ciphertext each time (due to random IV)', async () => {
    const { encryptToken } = await import('@/lib/crypto/tokens')
    const original = 'same_token'
    const enc1 = encryptToken(original)
    const enc2 = encryptToken(original)
    expect(enc1).not.toBe(enc2)
  })

  it('throws on tampered ciphertext', async () => {
    const { encryptToken, decryptToken } = await import('@/lib/crypto/tokens')
    const encrypted = encryptToken('test_token')
    const parts = encrypted.split(':')
    parts[2] = 'AAAA' + parts[2].substring(4) // Corrupt the ciphertext
    const tampered = parts.join(':')
    expect(() => decryptToken(tampered)).toThrow()
  })

  it('throws on invalid format', async () => {
    const { decryptToken } = await import('@/lib/crypto/tokens')
    expect(() => decryptToken('notvalid')).toThrow('Invalid ciphertext format')
  })
})
