require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shaba_water_system';

const managerSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'manager' },
}, { collection: 'managers' });

const Manager = mongoose.models.Manager || mongoose.model('Manager', managerSchema);

const createAdmin = async () => {
    const enteredUsername = process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;

    if (!enteredUsername || !password) {
        throw new Error('Set ADMIN_USERNAME and ADMIN_PASSWORD in the backend .env file.');
    }

    const usernameValue = enteredUsername.trim().replace(/^@/, '').toLowerCase();

    if (!/^[a-z0-9._-]{3,30}$/.test(usernameValue)) {
        throw new Error('Username must be 3-30 characters and contain only letters, numbers, dots, underscores, or hyphens.');
    }

    const username = `@${usernameValue}`;
    const existingManager = await Manager.findOne({
        username: { $in: [username, usernameValue] },
    }).lean();
    const existingCustomer = await mongoose.connection.collection('customers').findOne({
        username: { $in: [username, usernameValue] },
    });

    if (existingManager) {
        if (existingManager.role === 'admin') {
            console.log(`Admin account already exists. Sign in with username: ${username}`);
            return;
        }

        throw new Error(`The username "${username}" is already in use.`);
    }

    if (existingCustomer) {
        throw new Error(`The username "${username}" is already in use.`);
    }

    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await Manager.create({
        fullName: 'System Administrator',
        username,
        email: `${usernameValue}@shaaba.com`,
        phone: '+252000000000',
        password: passwordHash,
        role: 'admin',
    });

    console.log(`Admin account created. Sign in with username: ${username}`);
};

mongoose.connect(MONGO_URI)
    .then(createAdmin)
    .catch((error) => {
        console.error('Could not create admin account:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
