import { createAuthService } from '../../Logic/Services/AuthService.js';
import Result from '../../Logic/Monads/result.js';

describe('AuthService Unit Tests', () => {
    let userRepository, authRules, hashProvider, tokenProvider, blacklist, config, authService;

    beforeEach(() => {
        userRepository = { create: jest.fn(), delete: jest.fn() };
        authRules = {
            validateRegisterUser: jest.fn(),
            validateLoginUser: jest.fn(),
            validateLogoutUser: jest.fn(),
            validateGetProfile: jest.fn(),
            validateDeleteUser: jest.fn(),
        };
        hashProvider = { hash: jest.fn(), compare: jest.fn() };
        tokenProvider = { sign: jest.fn(), verify: jest.fn() };
        blacklist = { revoke: jest.fn() };
        config = { saltRounds: 10, jwtSecret: 'secret', jwtExpiresIn: '1h' };

        authService = createAuthService({ userRepository, authRules, hashProvider, tokenProvider, blacklist, config });
    });

    describe('registerUser', () => {
        const payload = {username:'moni', email:'moni@example.com', password:'123'};

        test('should return Err if the validation fails', async()=>{
            const errResult = Result.Err({statusCode:400, message:'Invalid data'});
            authRules.validateRegisterUser.mockResolvedValue(errResult);

            const result = await authService.registerUser(payload);

            expect(result.isErr()).toBe(true);
            expect(result.error).toEqual(errResult.error);
            expect(userRepository.create).not.toHaveBeenCalled();
        });

        test('should register the user if the validation is Ok', async()=> {
            authRules.validateRegisterUser.mockResolvedValue(Result.Ok(payload));
            hashProvider.hash.mockResolvedValue('hashed_password');
            userRepository.create.mockResolvedValue({id: 1});

            const result = await authService.registerUser(payload);

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({message:'User created successfully'});
            expect(hashProvider.hash).toHaveBeenCalledWith('123', 10);
            expect(userRepository.create).toHaveBeenCalledWith({
                username: 'moni',
                email: 'moni@example.com',
                password: 'hashed_password'
            });
        });
    });

    describe('loginUser', ()=> {
        const payload = {username:'moni', password: '123'};

        test('should return Err if the validation fails', async ()=> {
            authRules.validateLoginUser.mockResolvedValue(Result.Err({statusCode:401, message:'Invalid'}));

            const result = await authService.loginUser(payload);

            expect(result.isErr()).toBe(true);
            expect(tokenProvider.sign).not.toHaveBeenCalled();
        });

        test('should generate and return a token if the validation is Ok', async () => {
            // El validador devuelve el usuario en el Result.Ok
            authRules.validateLoginUser.mockResolvedValue(Result.Ok({user:{id:1, username:'moni'}}));
            tokenProvider.sign.mockReturnValue('mocked.jwt.token');
            const result = await authService.loginUser(payload);

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({accessToken: 'mocked.jwt.token'});
            expect(tokenProvider.sign).toHaveBeenCalledWith(
                { sub:1, username:'moni'},
                'secret',
                { expiresIn:'1h'}
            );
        });
    });

    describe('logoutUser', () => {
        test('should revoke the token if its Ok', async () => {
            authRules.validateLogoutUser.mockResolvedValue(Result.Ok(true));

            const result = await authService.logoutUser('fake-token');

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({message: 'User logged out successfully'});
            expect(blacklist.revoke).toHaveBeenCalledWith('fake-token');
        });

        test('returns Err if the logout validation is Err', async () => {
            authRules.validateLogoutUser.mockResolvedValue(Result.Err({statusCode: 401, message: 'Invalid token'}));

            const result = await authService.logoutUser('invalid-token');

            expect(result.isErr()).toBe(true);
            expect(blacklist.revoke).not.toHaveBeenCalled();
        });
    });

    describe('getProfile', () => {
        test('should return the profile if the validation is Ok', async () => {
            authRules.validateGetProfile.mockResolvedValue(
                Result.Ok({ user: {username: 'moni', email:'moni@example.com'}})
            );

            const result = await authService.getProfile(10);

            expect(result.isOk()).toBe(true);
            expect(result.value).toEqual({username:'moni',email:'moni@example.com'});
        });

        test('returns Err  if the validation fails', async()=>{
            authRules.validateGetProfile.mockResolvedValue(
                Result.Err({statusCode:404, message:'User not found'})
            );

            const result = await authService.getProfile(999);
            
            expect(result.isErr()).toBe(true);
        })
    });

    describe('deleteUser', () => {
        test('deletes the account and revokes its current token', async () => {
            authRules.validateDeleteUser.mockResolvedValue(Result.Ok(true));

            const result = await authService.deleteUser({
                id: '7', requesterId: 7, token: 'current-token'
            });

            expect(result.isOk()).toBe(true);
            expect(userRepository.delete).toHaveBeenCalledWith('7');
            expect(blacklist.revoke).toHaveBeenCalledWith('current-token');
        });

        test('does not delete when validation fails', async () => {
            authRules.validateDeleteUser.mockResolvedValue(
                Result.Err({statusCode:403, message:'You can only delete your own account'})
            );

            const result = await authService.deleteUser({
                id: '8', requesterId: 7, token: 'current-token'
            });

            expect(result.isErr()).toBe(true);
            expect(userRepository.delete).not.toHaveBeenCalled();
            expect(blacklist.revoke).not.toHaveBeenCalled();
        });
    });
});
