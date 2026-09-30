import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import models from '../../Data Access/Models/index.js';

describe('GameRepository',()=>{
    let creator;

    beforeAll(async ()=>{
        await models.sequelize.sync();
    });

    beforeEach(async ()=>{
        creator = await userRepository.create({username:'creator',email:'creator@example.com',password:'x'});
    });

    afterEach(async ()=>{
        await models.Game.destroy({where:{}, truncate:true});
        await models.User.destroy({where:{}, truncate:true});
    });

    it('create() creates a real game related to his user', async()=>{
        const game = await gameRepository.create({ name:'Partida A',creatorId:creator.id, state:'waiting'});
        expect(game.id).toBeDefined();
        expect(game.creatorId).toBe(creator.id);
    });

    it('findAll() teturns all the created games', async()=>{
        await gameRepository.create({ name:'Partida A', creatorId:creator.id, state:'waiting'});
        await gameRepository.create({ name:'Partida B', creatorId:creator.id, state:'waiting'});
        expect(await gameRepository.findAll()).toHaveLength(2);
    });

    it('findById() finds the exact game required', async()=>{
        const created = await gameRepository.create({name:'Partida A', creatorId:creator.id, state:'waiting'});
        const found = await gameRepository.findById(created.id);
        expect(found.name).toBe('Partida A');
    });

    it('findById() returns null if it doesnt exists', async()=>{
        expect(await gameRepository.findById(999)).toBeNull();
    });

    it('update() modofies an existent game', async ()=>{
        const created = await gameRepository.create({name:'Partida A', creatorId:creator.id, state:'waiting'});
        const updated = await gameRepository.update(created.id,{state:'in_progress'});
        expect(updated.state).toBe('in_progress');
    });

    it('update() returns null if the game doesnt exists',async()=>{
        expect(await gameRepository.update(999, {state:'finished'})).toBeNull();
    });

    it('delete() eliminates an existent game', async()=>{
        const created = await gameRepository.create({name:'Partida A', creatorId:creator.id, state:'waiting'});
        expect(await gameRepository.delete(created.id)).toBe(true);
        expect(await gameRepository.findById(created.id)).toBeNull();
    });

    it('delete() returns null if the game doesnt exists',async()=>{
        expect(await gameRepository.delete(999)).toBeNull();
    });
});