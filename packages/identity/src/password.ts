import bcrypt from 'bcryptjs';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, {
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
    algorithm: 2,
  });
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (passwordHash.startsWith('$2')) return bcrypt.compare(password, passwordHash);
  if (!passwordHash.startsWith('$argon2id$')) return false;
  return argonVerify(passwordHash, password);
}
