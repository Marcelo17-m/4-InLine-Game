import { authService } from '../../container.js';
import { handleResult } from '../../Middleware/handleResult.js';  

export const register = async (req, res, next) => {
    const result = await authService.registerUser(req.body);
    handleResult(res, result, 201);
};

export const login = async (req, res, next) => {
    const result = await authService.loginUser(req.body);
    handleResult(res, result);
};

export const logout = async (req, res, next) => {
    const result = await authService.logoutUser(req.token);
    handleResult(res, result);
}

export const profile = async (req, res, next) => {
    const result = await authService.getProfile(req.user.id);
    handleResult(res, result);
};

export const deleteUser = async (req, res, next) => {
    const result = await authService.deleteUser({
        id: req.params.id,
        requesterId: req.user.id,
        token: req.token,
    });
    if (result.isErr()) return handleResult(res, result);
    return res.status(204).send();
};
