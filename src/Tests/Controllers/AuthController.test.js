import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import { authService } from '../../container.js';
import Result from '../../Logic/Monads/result.js';

jest.mock('../../container.js', () => ({
    authService: {
        registerUser: jest.fn(),
        loginUser: jest.fn(),
        logoutUser: jest.fn(),
        getProfile: jest.fn(),
        deleteUser: jest.fn()
    }
}));

describe('Auth routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register',()=> {
        test('201 and the success message', async()=> {
            authService.registerUser.mockResolvedValue(Result.Ok({ message:'User registered successfully'}));
            
            const response = await request(app).post('/api/auth/register')
            .send({username:'moni', email:'moni@example.com', password:'123'});

            expect(response.status).toBe(201);
            expect(response.body).toEqual({message:'User registered successfully'});
            expect(authService.registerUser).toHaveBeenCalledWith({
                username: 'moni',
                email: 'moni@example.com',
                password: '123'
            });
        });

        test('409 when the service tells that the user already exists', async () =>{
            authService.registerUser.mockResolvedValue(Result.Err({statusCode:409, message:'User alredy exist'}));
 
            const response = await request(app).post('/api/auth/register').send({username: 'moni'});
 
            expect(response.status).toBe(409);
            expect(response.body).toEqual({error:'User alredy exist'});
        });
    });
    describe('POST /api/auth/login', () => {
        test('200 and the access token', async ()=>{
            authService.loginUser.mockResolvedValue(Result.Ok({access_token:'fake.jwt.token'}));

            const response = await request(app).post('/api/auth/login').send({username:'moni', password: '123'});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({access_token: 'fake.jwt.token'});

        });

        test('401 when the credentials are invalid', async() =>{
            authService.loginUser.mockResolvedValue(
                Result.Err({ statusCode: 401, message: 'Invalid credentials' })
            );

            const response = await request(app).post('/api/auth/login').send({username: 'holaxd', password:'adios'});

            expect(response.status).toBe(401);
            expect(response.body).toEqual({error: 'Invalid credentials'});
        });
    });

    describe('POST /api/auth/logout', () => {
        test('401 when the user doesnt send an access token', async()=>{
            const response = await request(app).post('/api/auth/logout').send({});

            expect(response.status).toBe(401);
            expect(authService.logoutUser).not.toHaveBeenCalledWith();
        });

        test('401 if the token is invalid or fake', async()=>{
            const response = await request(app).post('/api/auth/logout').send({access_token: 'noestoken'});

            expect(response.status).toBe(401);
        });

        test('200 when the token is valid', async()=>{
            const token = jwt.sign({sub:1, username: 'moni'}, process.env.JWT_SECRET, {expiresIn: '1h'});
            authService.logoutUser.mockResolvedValue(Result.Ok({message:'User logged out successfully'}));

            const response = await request(app).post('/api/auth/logout').send({access_token:token});

            expect(response.status).toBe(200);
            expect(authService.logoutUser).toHaveBeenCalledWith(token);
        });
    });

    describe('POST /api/auth/profile', () =>{
        test('401 without the token', async()=>{
            const response = await request(app).post('/api/auth/profile').send({});
            expect(response.status).toBe(401);
        });

        test('200 and the profile when the token is valid', async()=>{
            const token = jwt.sign({sub:10, username:'moni'}, process.env.JWT_SECRET, {expiresIn: '1h'});
            authService.getProfile.mockResolvedValue(Result.Ok({username:'moni', email:'moni@example.com'}));

            const response = await request(app).post('/api/auth/profile').send({access_token: token});

            expect(response.status).toBe(200);
            expect(response.body).toEqual({username: 'moni', email:'moni@example.com'});
        });
    });

    describe('DELETE /api/auth/users/:id', () => {
        test('204 when deleting your own account', async () => {
            const token = jwt.sign({sub:10, username:'moni'}, process.env.JWT_SECRET, {expiresIn:'1h'});
            authService.deleteUser.mockResolvedValue(Result.Ok(true));

            const response = await request(app)
                .delete('/api/auth/users/10')
                .send({access_token:token});

            expect(response.status).toBe(204);
            expect(authService.deleteUser).toHaveBeenCalledWith({
                id:'10', requesterId:10, token
            });
        });

        test('403 when attempting to delete another account', async () => {
            const token = jwt.sign({sub:10, username:'moni'}, process.env.JWT_SECRET, {expiresIn:'1h'});
            authService.deleteUser.mockResolvedValue(
                Result.Err({statusCode:403, message:'You can only delete your own account'})
            );

            const response = await request(app)
                .delete('/api/auth/users/11')
                .send({access_token:token});

            expect(response.status).toBe(403);
            expect(response.body).toEqual({error:'You can only delete your own account'});
        });
    });



});
