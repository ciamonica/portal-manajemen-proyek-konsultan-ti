const dotenv = require('dotenv');

dotenv.config();

const DEV_JWT_SECRET = 'development_only_jwt_secret_change_me';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const hasConfiguredSecret = secret && secret.trim() && secret !== 'replace_with_a_strong_secret';

  if (hasConfiguredSecret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  return DEV_JWT_SECRET;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '2h';
}

module.exports = { getJwtSecret, getJwtExpiresIn };
