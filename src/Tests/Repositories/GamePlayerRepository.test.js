import gamePlayerRepository from '../../Data Access/Repositories/GameplayerRepository.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import models from '../../Data Access/Models/index.js';

describe('GamePlayerRepository',()=>{
    let game;
    let alice;
    let bob;

    beforeAll(async()=>{
        await models.sequelize.sync();
    });

    beforeEach(async ()=>{
        alice = await userRepository.create({ username:'alice',email:'a@a.com',password:'x'});
        bob = await userRepository.create({ username:'bob',email:'b@b.com', password:'x'});
        game = await gameRepository.create({ name:'Partida A',creatorId:alice.id, state:'waiting'});
    });

    afterEach(async()=>{
        await models.GamePlayer.destroy({ where:{},truncate:true});
        await models.Game.destroy({where:{},truncate: true});
        await models.User.destroy({where:{},truncate: true});
    });

    test('create() inserta la relación usuario-juego', async()=>{
        const gamePlayer = await gamePlayerRepository.create({gameId:game.id, userId:alice.id, turnOrder:0});
        expect(gamePlayer.id).toBeDefined();
        expect(gamePlayer.gameId).toBe(game.id);
        expect(gamePlayer.userId).toBe(alice.id);
    });

    test('create() uses turnOrder=0 if they dont pass it', async()=>{
        const gamePlayer = await gamePlayerRepository.create({ gameId: game.id, userId: alice.id });
        expect(gamePlayer.turnOrder).toBe(0);
    });

    test('findByGameId() returns the users with the username, sort by turn', async()=> {
        await gamePlayerRepository.create({gameId:game.id, userId:bob.id, turnOrder:1});
        await gamePlayerRepository.create({gameId:game.id, userId:alice.id, turnOrder:0});
        const players = await gamePlayerRepository.findByGameId(game.id);
        expect(players).toHaveLength(2);
        expect(players[0].User.username).toBe('alice');
        expect(players[1].User.username).toBe('bob');
    });

    test('findByGameAndUser() finds the exact row', async()=>{
        await gamePlayerRepository.create({ gameId:game.id, userId:alice.id, turnOrder:0});
        const found = await gamePlayerRepository.findByGameAndUser(game.id, alice.id);
        expect(found).not.toBeNull();
        expect(found.userId).toBe(alice.id);
    });

    test('findByGameAndUser() returns null if the combination doesnt exists', async()=> {
        expect(await gamePlayerRepository.findByGameAndUser(game.id, bob.id)).toBeNull();
    });

    test('fails if the user is trying to join the same game twice',async()=> {
        await gamePlayerRepository.create({gameId:game.id, userId:alice.id, turnOrder:0});
        await expect(
            gamePlayerRepository.create({gameId:game.id, userId:alice.id, turnOrder:1})
        ).rejects.toThrow();
    });

    test('update() modifes an existent row',async()=> {
        const created = await gamePlayerRepository.create({gameId:game.id, userId:alice.id, turnOrder:0});
        const updated = await gamePlayerRepository.update(created.id, {score:40});
        expect(updated.score).toBe(40);
    });

    test('update() returns null if the gamePlayer doesnt exists', async()=>{
        expect(await gamePlayerRepository.update(999, {score:10})).toBeNull();
    })

    test('delete() eliminatios the relation and there is no row',async()=> {
        const created = await gamePlayerRepository.create({gameId:game.id, userId:alice.id, turnOrder:0});
        expect(await gamePlayerRepository.delete(created.id)).toBe(true);
        expect(await gamePlayerRepository.findByGameAndUser(game.id, alice.id)).toBeNull();
    });

    test('delete() returns null if the gamePlayer doesnt exist', async()=>{
        expect(await gamePlayerRepository.update(999, {score:10})).toBeNull();
    })
});