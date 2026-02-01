const validator = require('validator');

function validateuser(data) {
    const mendatoryFields = ['name', 'email', 'password'];
    const isvalied = mendatoryFields.every((field) => {
        return data[field] !== undefined && data[field] !== null && data[field] !== '';
    });

    if (!isvalied) {
        throw new Error('Missing mandatory fields');
    }

    if (!validator.isEmail(data.email)) {
        throw new Error('Invalid email format');
    }

    if (data.password.length < 6 || data.password.length > 20) {
        throw new Error('Password must be at least 6 characters long and at most 20 characters long');
    }
}

module.exports = validateuser;
