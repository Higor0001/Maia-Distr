import { randomBytes, scryptSync } from "node:crypto"

const password = process.argv[2]

if (!password || password.length < 10) {
  console.error("Uso: node scripts/generate-password-hash.mjs <senha-com-no-minimo-10-caracteres>")
  process.exit(1)
}

const salt = randomBytes(16).toString("base64url")
const hash = scryptSync(password, salt, 64).toString("base64url")
console.log(`scrypt$${salt}$${hash}`)
