const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('password', 10));
