const bcrypt = require('bcrypt');

const some = 'some';
fasfasdf 

fasdfs
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

module.exports = hashPassword;
