import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import gameRepository from './Data Access/Repositories/GameRepository.js';
import userRepository from './Data Access/Repositories/UserRepository.js';
import gamePlayerRepository from './Data Access/Repositories/GameplayerRepository.js';
import historyRepository from './Data Access/Repositories/HistoryRepository.js';
import apiStatsRepository from './Data Access/Repositories/ApiStatsRepository.js';
import { revoke } from './Middleware/tokenBlacklist.js';
import { createAuthValidator } from './Logic/Validators/AuthValidator.js';
import { createAuthRules } from './Logic/Validators/AuthValidatorRules.js';
import { createAuthService } from './Logic/Services/AuthService.js';
import { createGameValidator} from './Logic/Validators/GameValidator.js';
import { createGameService} from './Logic/Services/GameService.js';
import { createGameRules} from './Logic/Validators/GameValidatorRules.js';
import * as connectFourRules from './Helpers/connectFourRules.js';
import { createStatsService } from './Logic/Services/StatsService.js';
import _ from 'lodash';

const hashProvider = {
    hash: (plain, rounds) => bcrypt.hash(plain, rounds),
    compare: (plain, hashed) => bcrypt.compare(plain, hashed),
};
 
const tokenProvider = {
    sign: (payload, secret, options) => jwt.sign(payload, secret, options),
    verify: (token, secret) => jwt.verify(token, secret),
};
 
const authValidator = createAuthValidator({ userRepository, hashProvider });
const authRules = createAuthRules(authValidator);
 
export const authService = createAuthService({
    userRepository,
    authRules,
    hashProvider,
    tokenProvider,
    blacklist: { revoke },
    config: {
        saltRounds: 10,//esto son los datos aleatorios para que las contraseñas
                    // no sean identicas si se hashean dos veces la misma
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN,
    },
});

const gameValidator = createGameValidator({
    gameRepository, gamePlayerRepository, userRepository, helpers: connectFourRules,
});
const gameRules = createGameRules(gameValidator);

export const gameService = createGameService({
    gameRepository,
    gamePlayerRepository,
    historyRepository,
    gameRules,
    helpers: connectFourRules,
});

export const statsApiService = createStatsService({
    apiStatsRepository,
    _
});
