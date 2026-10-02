import { DataTypes } from 'sequelize';
import sequelize from '../database.js';
import gameModel from './Game.js';
import userModel from './User.js';
import gamePlayerModel from './Gameplayer.js';
import historyModel from './History.js';
import apiStatsModel from './ApiStats.js';
import invitationModel from './Invitation.js';

export const createModels = (sequelize) => {
    const models = {};

    models.Game = gameModel(sequelize, DataTypes);
    models.User = userModel(sequelize, DataTypes);
    models.GamePlayer = gamePlayerModel(sequelize, DataTypes);
    models.History = historyModel(sequelize, DataTypes);
    models.ApiStats = apiStatsModel(sequelize, DataTypes);
    models.Invitation = invitationModel(sequelize, DataTypes);

    models.sequelize = sequelize;

    Object.keys(models).forEach((name) => {
        if (models[name] && typeof models[name].associate === 'function') {
            models[name].associate(models);
        }
    });

    return models;
};

const models = createModels(sequelize);

export const { Game, User, GamePlayer, History, ApiStats, Invitation } = models;

export default models;
