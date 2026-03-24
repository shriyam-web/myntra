require('dotenv').config({ path: '.env.local' });

console.log('MONGODB_URI from env:', process.env.MONGODB_URI);
console.log('First 80 chars:', process.env.MONGODB_URI.substring(0, 80));
