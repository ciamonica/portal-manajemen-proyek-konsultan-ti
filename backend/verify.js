const bcrypt = require('bcrypt');

const hashes = [
  '$2y$10$UJmmaGOAhJsHUv/gi0Tzu.wHnEHtUQzUnakaAZEPFY5cfDeYMNGQS',
  '$2y$10$7ZntQsKYmcJGTA5fCuIo/.DjnnK.4ffRtmjNIY1kWRyRnUHtRr6/K'
];

const candidates = [
  'konsultan123',
  'password',
  'password123',
  'fairy123',
  'dev123',
  'client123',
  '12345678',
  'admin123',
  'secret123',
  'hello123',
  'fairy',
  'dev1',
  'client1'
];

function normalizedHash(h) {
  return h.replace(/^\$2y\$/,'$2a$');
}

(async () => {
  for (const candidate of candidates) {
    const results = await Promise.all(hashes.map(hash => bcrypt.compare(candidate, normalizedHash(hash))));
    console.log(candidate, results);
  }
})();
