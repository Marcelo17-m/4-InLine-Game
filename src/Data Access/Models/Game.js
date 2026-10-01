import { createEmptyBoard, validateBoard } from '../connectFourSchema.js';

const gameModel = (sequelize, DataTypes) => {
    const Game = sequelize.define(
        'Game',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            creatorId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            state: {
                type: DataTypes.ENUM('pending', 'in_progress', 'finished', 'rejected'),
                allowNull: false,
                defaultValue: 'pending',
                validate: { isIn: [['pending', 'in_progress', 'finished', 'rejected']] },
            },
            currentPlayerId:{
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            board: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: createEmptyBoard,
                validate: { validBoard: validateBoard },
            },
            winnerId: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            finishReason: {
                type: DataTypes.ENUM('four_in_line', 'draw', 'abandoned', 'rejected'),
                allowNull: true,
                validate: { isIn: [['four_in_line', 'draw', 'abandoned', 'rejected']] },
            },
            finishedAt: { type: DataTypes.DATE, allowNull: true },
        },
        {
            tableName: 'games',
            timestamps: true,
            createdAt: 'createdAt',
            updatedAt: false,
            indexes: [{ fields: ['state'] }],
            validate: {
                coherentConnectFourState() {
                    validateBoard(this.board);
                    if (this.state === 'finished') {
                        if (!this.finishReason || !this.finishedAt || this.currentPlayerId != null) {
                            throw new Error('A finished Connect Four game requires a reason, end time and no current player');
                        }
                        if (!['four_in_line', 'draw', 'abandoned'].includes(this.finishReason)) {
                            throw new Error('A finished Connect Four game requires a game result');
                        }
                        if ((this.finishReason === 'draw') !== (this.winnerId == null)) {
                            throw new Error('A draw has no winner; a win or abandoned game requires a winner');
                        }
                    } else if (this.state === 'rejected') {
                        if (this.finishReason !== 'rejected' || !this.finishedAt ||
                            this.currentPlayerId != null || this.winnerId != null) {
                            throw new Error('A rejected game requires a rejected reason, end time and no winner');
                        }
                    } else if (this.winnerId != null || this.finishReason != null || this.finishedAt != null) {
                        throw new Error('An unfinished Connect Four game cannot have a result');
                    }
                },
            },
        }
    );

    Game.associate = (models) => {
        Game.belongsTo(models.User, { foreignKey: 'creatorId', as: 'creator' });
        Game.belongsTo(models.User, { foreignKey: 'currentPlayerId', as: 'currentPlayer' });
        Game.belongsTo(models.User, { foreignKey: 'winnerId', as: 'winner', onDelete: 'RESTRICT' });
        Game.hasMany(models.Invitation, { foreignKey: 'gameId', as: 'invitations' });
        Game.hasMany(models.GamePlayer, { foreignKey: 'gameId' });
        Game.belongsToMany(models.User, {
            through: models.GamePlayer,
            foreignKey: 'gameId',
            otherKey: 'userId',
            as: 'players',
        });
        Game.hasMany(models.History, {foreignKey: 'gameId'});
    };

    return Game;

};

export default gameModel;
