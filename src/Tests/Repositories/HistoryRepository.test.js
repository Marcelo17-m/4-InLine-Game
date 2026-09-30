import historyRepository from '../../Data Access/Repositories/HistoryRepository.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import models from '../../Data Access/Models/index.js';

describe('HistoryRepository', ()=>{
    let game;
    let alice;

    beforeAll(async ()=>{
        await models.sequelize.sync();
    });

    beforeEach(async ()=>{
        alice = await userRepository.create({ username:'alice', email:'a@a.com', password:'x' });
        game = await gameRepository.create({ name:'Partida A', creatorId: alice.id, state:'waiting' });
    });

    afterEach(async ()=>{
        await models.History.destroy({ where:{}, truncate:true });
        await models.Game.destroy({ where:{}, truncate:true });
        await models.User.destroy({ where:{}, truncate:true });
    });

    test('create() inserts a history entry tied to the game and the player', async()=>{
        const entry = await historyRepository.create({gameId:game.id, playerId:alice.id,action: 'Played red 7' });
        expect(entry.id).toBeDefined();
        expect(entry.gameId).toBe(game.id);
        expect(entry.playerId).toBe(alice.id);
        expect(entry.action).toBe('Played red 7');
    });

    test('findByGameId() returns the entries with the players username, ordered from old to newest', async()=>{
        await historyRepository.create({
            gameId: game.id, playerId: alice.id, action: 'Drew a card', createdAt: new Date('2026-01-01T10:00:00'),
        });
        await historyRepository.create({
            gameId: game.id, playerId: alice.id, action: 'Played red 7', createdAt: new Date('2026-01-01T10:00:05'),
        });

        const history = await historyRepository.findByGameId(game.id);
        expect(history).toHaveLength(2);
        expect(history[0].action).toBe('Drew a card');
        expect(history[1].action).toBe('Played red 7');
        expect(history[0].player.username).toBe('alice');
    });

    test('findByGameId() returns an empty array if the game has no history yet', async ()=>{
        expect(await historyRepository.findByGameId(game.id)).toHaveLength(0);
    });
});