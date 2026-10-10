import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sequelize from '../../Data Access/database.js';
import { User } from '../../Data Access/Models/index.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import { createAuthValidator } from '../../Logic/Validators/AuthValidator.js';
import { createAuthRules } from '../../Logic/Validators/AuthValidatorRules.js';
import { createAuthService } from '../../Logic/Services/AuthService.js';

const hashProvider = { hash: bcrypt.hash, compare: bcrypt.compare };
const authRules = createAuthRules(createAuthValidator({ userRepository, hashProvider }));
const service = createAuthService({
    userRepository, authRules, hashProvider,
    tokenProvider: { sign: jwt.sign }, blacklist: { revoke: jest.fn() },
    config: { saltRounds: 4, jwtSecret: 'email-test-only-secret', jwtExpiresIn: '1h' },
});
const register = (username, email) => service.registerUser({ username, email, password: 'test-password' });

beforeEach(() => sequelize.sync({ force: true }));
afterAll(() => sequelize.close());

test('registration normalizes and persists email and still supports username login', async () => {
    const result = await register('alice', ' Alice@Example.com ');
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual({ message: 'User created successfully' });
    const user = await userRepository.findByEmail('alice@example.com');
    expect(user.username).toBe('alice');
    expect(user.passwordHash).toBeUndefined();
    expect(user.toJSON()).not.toHaveProperty('passwordHash');
    expect(await userRepository.findByEmail('missing@example.com')).toBeNull();
    const credentials = await userRepository.findByUsername('alice');
    expect(await bcrypt.compare('test-password', credentials.passwordHash)).toBe(true);
    const login = await service.loginUser({ username: 'alice', password: 'test-password' });
    expect(login.isOk()).toBe(true);
    expect(jwt.verify(login.value.accessToken, 'email-test-only-secret').sub).toBe(user.id);
});

test('rejects duplicate emails across usernames, ignoring case and surrounding spaces', async () => {
    await register('alice', 'alice@example.com');
    const duplicate = await register('bob', ' ALICE@example.com ');
    expect(duplicate.error).toEqual({ statusCode: 409, message: 'Email already exists' });
    expect(await User.count()).toBe(1);
});

test('allows multiple users without email and rejects duplicate usernames', async () => {
    expect((await register('alice')).isOk()).toBe(true);
    expect((await register('bob', null)).isOk()).toBe(true);
    expect((await userRepository.findByUsername('alice')).email).toBeNull();
    expect((await register('alice', 'new@example.com')).error.statusCode).toBe(409);
    expect(await User.count()).toBe(2);
});

test.each(['', 'invalid', 'a b@example.com', 123, {}, 'a'.repeat(250) + '@example.com'])(
    'rejects invalid email %p before creating an account', async (email) => {
        const result = await register('alice', email);
        expect(result.error).toEqual({ statusCode: 400, message: 'email must be a valid email address' });
        expect(await User.count()).toBe(0);
    },
);

test('the database also enforces uniqueness for stored emails', async () => {
    await register('alice', 'alice@example.com');
    await expect(userRepository.create({
        username: 'bob', email: 'alice@example.com', passwordHash: 'test-only-hash',
    })).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
});
