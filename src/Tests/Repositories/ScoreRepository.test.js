import scoreRepository from '../../Data Access/Repositories/ScoreRepository.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import models from '../../Data Access/Models/index.js';

describe('ScoreRepository', ()=>{
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
        await models.Score.destroy({ where:{}, truncate:true });
        await models.Game.destroy({ where:{}, truncate:true });
        await models.User.destroy({ where:{}, truncate:true });
    });

    test('create() inserts a score tied to the player and the game', async ()=>{
        const score = await scoreRepository.create({ playerId: alice.id, gameId: game.id, score: 34 });
        expect(score.id).toBeDefined();
        expect(score.playerId).toBe(alice.id);
        expect(score.score).toBe(34);
    });

    test('findAll() returns every score', async ()=>{
        await scoreRepository.create({ playerId: alice.id, gameId: game.id, score: 34 });
        expect(await scoreRepository.findAll()).toHaveLength(1);
    });

    test('findById() returns the matching score', async ()=>{
        const created = await scoreRepository.create({ playerId: alice.id, gameId: game.id, score: 34 });
        expect((await scoreRepository.findById(created.id)).id).toBe(created.id);
    });

    test('findById() returns null if the score doesnt exist', async ()=>{
        expect(await scoreRepository.findById(9999)).toBeNull();
    });

    test('findByPlayerId() returns only the scores of that player', async ()=>{
        const bob = await userRepository.create({ username:'bob', email:'b@b.com', password:'x' });
        await scoreRepository.create({ playerId: alice.id, gameId: game.id, score: 34 });
        await scoreRepository.create({ playerId: bob.id, gameId: game.id, score: 12 });
        const aliceScores = await scoreRepository.findByPlayerId(alice.id);
        expect(aliceScores).toHaveLength(1);
        expect(aliceScores[0].playerId).toBe(alice.id);
    });

    test('update() modifies an existent score', async ()=>{
        const created = await scoreRepository.create({ playerId: alice.id, gameId: game.id, score: 34 });
        const updated = await scoreRepository.update(created.id, { score: 50 });
        expect(updated.score).toBe(50);
    });

    test('update() returns null if the score doesnt exist', async ()=>{
        expect(await scoreRepository.update(9999, { score: 50 })).toBeNull();
    });

    test('delete() eliminates an existent score and returns true', async ()=>{
        const created = await scoreRepository.create({ playerId: alice.id, gameId: game.id, score: 34 });
        expect(await scoreRepository.delete(created.id)).toBe(true);
        expect(await scoreRepository.findById(created.id)).toBeNull();
    });

    test('delete() returns null if the score doesnt exist', async ()=>{
        expect(await scoreRepository.delete(9999)).toBeNull();
    });
});