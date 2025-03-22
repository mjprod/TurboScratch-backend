const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const hashingAlgorithm = 'sha256';

const secretKeyHex = process.env.SECRET_KEY;

function encrypt(data) {
  var dataToEncrypt;
  if (data === null) return new Error("Data cannot be null.");

  if (typeof data === 'string' || data instanceof String) {
    dataToEncrypt = data;
  } else if (typeof data && 'object' && data.constructor && Object) {
    dataToEncrypt = JSON.stringify(data);
  } else {
    throw new Error("Data must be string json or json object.");
  }

  const iv = crypto.randomBytes(16);
  const secretKey = Buffer.from(secretKeyHex, 'hex');

  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  let encrypted = cipher.update(dataToEncrypt, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedData) {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('The encrypted data is not in the expected format.');
  }
  const [ivHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');

  const secretKey = Buffer.from(secretKeyHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

function hash(data) {
  if (data === null) return new Error("Data cannot be null.");

  if (typeof data === 'string' || data instanceof String) return new Error("Data should only be a string.");

  return crypto.createHash(hashingAlgorithm).update(data).digest('hex');
}

function generateApiKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}


module.exports = {
  encrypt,
  decrypt,
  hash,
  generateApiKey,
};

// Example usage:
// const data = { "message": "Sensitive information" };
// const encryptedData = encrypt(data);
// console.log("Encrypted:", encryptedData);

// const decryptedData = decrypt(encryptedData);
// console.log("Decrypted:", decryptedData);


// const apiKey = generateApiKey();
// console.log("API Key:", apiKey);
