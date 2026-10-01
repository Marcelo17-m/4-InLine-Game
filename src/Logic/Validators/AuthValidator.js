import Result from '../Monads/result.js';

export const createAuthValidator = ({ userRepository, hashProvider }) => {
    const validateRegisterFieldsProvided = async (data) => {
        const { username, password } = data;
        if (!username || !password) {
            return Result.Err({ statusCode: 400, message: 'username and password are mandatory' });
        }
        return Result.Ok(data);
    };
 
    const validateUsernameNotTaken = async (data) => {
        const existingUsername = await userRepository.findByUsername(data.username);
        if (existingUsername) {
            return Result.Err({ statusCode: 409, message: 'User already exist' });
        }
        return Result.Ok(data);
    };
 
    const validateLoginFieldsProvided = async (data) => {
        if (!data.username || !data.password) {
            return Result.Err({ statusCode: 400, message: 'Username and password are mandatory' });
        }
        return Result.Ok(data);
    };
 
    const validateUserExistsForLogin = async (data) => {
        const user = await userRepository.findByUsername(data.username);
        if (!user) {
            return Result.Err({ statusCode: 401, message: 'Invalid Credentials' });
        }
        return Result.Ok({ ...data, user });
    };
 
    const validatePasswordMatches = async (data) => {
        const passwordMatches = await hashProvider.compare(data.password, data.user.passwordHash);
        if (!passwordMatches) {
            return Result.Err({ statusCode: 401, message: 'Invalid Credentials' });
        }
        return Result.Ok(data);
    };
 
    const validateIdProvided = async (data) => {
        if (!data.id) {
            return Result.Err({ statusCode: 400, message: 'id is required' });
        }
        return Result.Ok(data);
    };
 
    const validateUserExists = async (data) => {
        const user = await userRepository.findById(data.id);
        if (!user) {
            return Result.Err({ statusCode: 404, message: 'User not found' });
        }
        return Result.Ok({ ...data, user });
    };

    const validateUserCanDeleteAccount = async (data) => {
        if (String(data.id) !== String(data.requesterId)) {
            return Result.Err({ statusCode: 403, message: 'You can only delete your own account' });
        }
        return Result.Ok(data);
    };

    const validateTokenProvided = async (data) => {
        if (!data.token) {
            return Result.Err({ statusCode: 400, message: 'token is required' });
        }
        return Result.Ok(data);
    };
 
    return {
        validateRegisterFieldsProvided,
        validateUsernameNotTaken,
        validateLoginFieldsProvided,
        validateUserExistsForLogin,
        validatePasswordMatches,
        validateIdProvided,
        validateUserExists,
        validateUserCanDeleteAccount,
        validateTokenProvided,
    };
};
