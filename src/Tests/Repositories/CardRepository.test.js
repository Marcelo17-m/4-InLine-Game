import cardRepository from '../../Data Access/Repositories/CardRepository.js';
import gameRepository from '../../Data Access/Repositories/GameRepository.js';
import userRepository from '../../Data Access/Repositories/UserRepository.js';
import models from '../../Data Access/Models/index.js';

describe('CardRepository', ()=>{
    let game;
    let owner;

    beforeAll(async ()=>{
        await models.sequelize.sync();
    });

    beforeEach(async ()=>{
        const creator = await userRepository.create({ username:'creator',email:'c@c.com',password:'x'});
        owner = await userRepository.create({username:'owner',email:'o@o.com', password:'x'})
        game = await gameRepository.create({ name:'Partida A',creatorId: creator.id, state:'waiting' });
    });

    afterEach(async ()=>{
        await models.Card.destroy({where:{},truncate:true});
        await models.Game.destroy({where:{},truncate:true});
        await models.User.destroy({where:{},truncate:true});
    });

    test('creates inserts a real card related to his game', async ()=>{
        const card = await cardRepository.create({ color:'blue',type:'number',value:'3',gameId:game.id});
        expect(card.id).toBeDefined();
        expect(card.gameId).toBe(game.id);
        expect(card.location).toBe('deck');
    });

    test('bulkcreate() inserts several cards at once', async()=>{
        await cardRepository.bulkCreate([
            {color:'blue', value:'3', type:'number', gameId:game.id},
            {color:'red', value:'skip', type:'action', gameId:game.id},
        ]);
        expect(await cardRepository.findByGameId(game.id)).toHaveLength(2);
    });

    test('findAll() returns every card', async() =>{
        await cardRepository.create({color:'blue', value:'3',type:'number', gameId:game.id});
        expect(await cardRepository.findAll()).toHaveLength(1);
    });

    test('findById() returns the matching card', async ()=>{
        const created = await cardRepository.create({ color:'blue',type:'number', value:'3', gameId:game.id });
        expect((await cardRepository.findById(created.id)).id).toBe(created.id);
    });

    test('findById() returns null if the card doesnt exist', async ()=>{
        expect(await cardRepository.findById(9999)).toBeNull();
    });

    test('findByGameId() returns only the cards of that game', async()=>{
        await cardRepository.create({ color:'blue',type:'number',value: '3',gameId:game.id});
        await cardRepository.create({ color:'red',type:'number',value: '7', gameId:game.id});
        expect(await cardRepository.findByGameId(game.id)).toHaveLength(2);
    });

    test('findPlayerHand() returns only the cards owned and in hand', async ()=>{
        await cardRepository.create({ color:'blue',type:'number', value:'3', gameId:game.id, location:'hand', ownerId: owner.id });
        await cardRepository.create({ color:'red',type:'number', value:'7', gameId:game.id, location:'deck' });
        const hand = await cardRepository.findPlayerHand(game.id, owner.id);
        expect(hand).toHaveLength(1);
        expect(hand[0].color).toBe('blue');
    });

    test('findNextInDeck() returns cards from the deck ordered by id, respecting the limit', async ()=>{
        const first = await cardRepository.create({ color:'blue',type:'number', value:'3', gameId:game.id });
        const second = await cardRepository.create({ color:'red',type:'number', value:'7', gameId:game.id });
        await cardRepository.create({ color:'green',type:'number', value:'9', gameId:game.id });

        const nextTwo = await cardRepository.findNextInDeck(game.id, 2);
        expect(nextTwo).toHaveLength(2);
        expect(nextTwo[0].id).toBe(first.id);
        expect(nextTwo[1].id).toBe(second.id);
    });

    test('findNextInDeck() defaults to a limit of 1', async ()=>{
        await cardRepository.create({ color:'blue',type:'number', value:'3', gameId:game.id });
        await cardRepository.create({ color:'red',type:'number', value:'7', gameId:game.id });
        expect(await cardRepository.findNextInDeck(game.id)).toHaveLength(1);
    });

    test('findTopDiscard() returns the last discarded card not the first one', async()=>{
        await cardRepository.create({
            color:'blue',type:'number', value:'3',gameId:game.id,location:'discard',playedAt: new Date('2026-01-01'),
        });
        await cardRepository.create({
            color: 'red',type:'number',value:'7', gameId: game.id,location:'discard',playedAt:new Date('2026-01-02'),
        });
        const top = await cardRepository.findTopDiscard(game.id);
        expect(top.color).toBe('red');
        expect(top.value).toBe('7');
    });

    test('findTopDiscard() returns full if there are no discarded cards', async()=>{
        await cardRepository.create({color:'blue',type:'number',value: '3',gameId:game.id, location:'deck'});
        expect(await cardRepository.findTopDiscard(game.id)).toBeNull();
    });

    test('update() modifies and existent card', async()=>{
        const created = await cardRepository.create({color: 'blue',type:'number',value:'3',gameId:game.id});
        const updated = await cardRepository.update(created.id, {location:'hand'});
        expect(updated.location).toBe('hand');
    });

    test('update() returns null if the card doesnt exist', async ()=>{
        expect(await cardRepository.update(9999, { location:'hand' })).toBeNull();
    });

    test('delete() eliminates and existent card and returns true', async()=>{
        const created = await cardRepository.create({color:'blue',type:'number',value:'3',gameId:game.id});
        expect(await cardRepository.delete(created.id)).toBe(true);
        expect(await cardRepository.findById(created.id)).toBeNull();
    });

    test('delete() returns null if the card doesnt exist', async ()=>{
        expect(await cardRepository.delete(9999)).toBeNull();
    });
});