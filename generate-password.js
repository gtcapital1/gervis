import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function generateHash(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Generate hash for "Gervis1"
generateHash('Gervis1').then(hash => {
  console.log('Password: Gervis1');
  console.log('Hash:', hash);
}); 