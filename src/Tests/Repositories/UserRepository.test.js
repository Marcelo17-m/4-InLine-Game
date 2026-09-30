import userRepository from '../../Data Access/Repositories/UserRepository.js';
import models from '../../Data Access/Models/index.js';

describe('UserRepository (end-to-end)',()=>{
    beforeAll(async ()=>{
        await models.sequelize.sync();
    });

    afterEach(async ()=>{
        await models.User.destroy({where:{},truncate:true});
    });

    test('create() inserta un usuario real en la base de datos', async()=>{
        const user = await userRepository.create({
            username:'alice',email:'alice@example.com', password:'hashed_password',});
        expect(user.id).toBeDefined();
        expect(user.username).toBe('alice');
        expect(await models.User.findAll()).toHaveLength(1);
    });

    test('fails if you try to create two users with the same username', async ()=>{
        await userRepository.create({ username:'alice', email:'a@a.com', password:'x' });
        await expect(
            userRepository.create({ username:'alice', email:'other@a.com', password:'x' })
        ).rejects.toThrow();
    });

    test('fails if you try to create two users with the same email', async ()=>{
        await userRepository.create({ username:'alice', email:'a@a.com', password:'x' });
        await expect(
            userRepository.create({ username:'alice2', email:'a@a.com', password:'x' })
        ).rejects.toThrow();
    });

    test('findAll() returns every user', async()=>{
        await userRepository.create({username:'alice', email:'a@a.com', password:'x'});
        await userRepository.create({username:'moni', email:'moni@a.com', password:'x'})
        expect(await userRepository.findAll()).toHaveLength(2);
    });

    test('findById() returns the matching user', async()=>{
        const created = await userRepository.create({username:'alice', email:'a@a.com', password:'x'});
        expect((await userRepository.findById(created.id)).id).toBe(created.id);
    });

    test('findById() returns null if the user doesnt exists', async()=>{
        expect(await userRepository.findById(999)).toBeNull();
    });

    test('findByUsername() encuentra un usuario existente', async()=>{
        await userRepository.create({ username:'bob',email:'bob@example.com',password:'x'});
        const found = await userRepository.findByUsername('bob');
        expect(found).not.toBeNull();
        expect(found.email).toBe('bob@example.com');
    });

    test('findByUsername() devuelve null si no existe', async()=>{
        expect(await userRepository.findByUsername('ghost')).toBeNull();
    });

    test('findByEmail() encuentra un usuario existente', async()=>{
        await userRepository.create({username:'carol',email:'carol@example.com', password:'x'});
        const found = await userRepository.findByEmail('carol@example.com');
        expect(found.username).toBe('carol');
    });

    it('findByEmail() returns null if there is no match', async ()=>{
        expect(await userRepository.findByEmail('ghost@ghost.com')).toBeNull();
    });

    test('findById() encuentra un usuario por su id autogenerado', async()=>{
        const created = await userRepository.create({username:'dave', email:'dave@example.com',password:'x'});
        const found = await userRepository.findById(created.id);
        expect(found.username).toBe('dave');
    });

    test('update() modifies an existent user', async ()=>{
        const created = await userRepository.create({ username:'alice', email:'a@a.com', password:'x' });
        const updated = await userRepository.update(created.id, { username:'alice2' });
        expect(updated.username).toBe('alice2');
    });

    test('update() returns null if the user doesnt exist', async ()=>{
        expect(await userRepository.update(9999, { username:'ghost' })).toBeNull();
    });

    test('delete() eliminates an existent user and returns true', async ()=>{
        const created = await userRepository.create({ username:'alice', email:'a@a.com', password:'x' });
        expect(await userRepository.delete(created.id)).toBe(true);
        expect(await userRepository.findById(created.id)).toBeNull();
    });

    test('delete() returns null if the user doesnt exist', async ()=>{
        expect(await userRepository.delete(9999)).toBeNull();
    });
});