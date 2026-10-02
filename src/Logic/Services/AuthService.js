export const createAuthService = ({ userRepository, authRules,
     hashProvider, tokenProvider, blacklist, config }) => {

    const registerUser = async ({ username, password }) => {
        const result = await authRules.validateRegisterUser({ username, password });
        if (result.isErr()) return result;

        const hashedPassword = await hashProvider.hash(password, config.saltRounds);
        await userRepository.create({ username, passwordHash: hashedPassword });

        return result.map(() => ({message: 'User created successfully'}));
    };

    const loginUser = async ({username, password}) => {
        const result = await authRules.validateLoginUser({username, password});
        if (result.isErr()) return result;

        //el mismo validador ya nos esta validadndo la contraseña 
        const {user} = result.value;
        const payload = {sub: user.id, username: user.username};

        const accessToken = tokenProvider.sign(payload, config.jwtSecret, {
            expiresIn: config.jwtExpiresIn,
        });

        return result.map(() => ({accessToken}));
    };

    const logoutUser = async (token) => {
        const result = await authRules.validateLogoutUser({token});
        if (result.isErr()) return result;

        blacklist.revoke(token);
        return result.map(() => ({ message: 'User logged out successfully' }));
    };

    const getProfile = async (userId) => {
        const result = await authRules.validateGetProfile({id: userId});
        if (result.isErr()) return result;

        return result.map(({ user }) => ({ id: user.id, username: user.username }));
    };

    const deleteUser = async ({id, requesterId, token}) => {
        const result = await authRules.validateDeleteUser({id, requesterId, token});
        if (result.isErr()) return result;

        await userRepository.delete(id);
        blacklist.revoke(token);

        return result.map(() => true);
    };

    return {registerUser, loginUser, getProfile, logoutUser, deleteUser};
};
