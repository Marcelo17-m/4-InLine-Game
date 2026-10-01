import { User } from '../Models/index.js';

class UserRepository {
    async create(data) {
        return User.create(data);
    }

    async findAll() {
        return User.findAll();
    }

    async findById(id){
        return User.findByPk(id);
    }

    async findByUsername(username){
        return User.scope('withPasswordHash').findOne({ where: { username } });
    }

    async update(id, data) {
        const user = await User.findByPk(id);
        if(!user){
            return null;
        }
        return user.update(data);
    }

    async delete(id) {
        const user = await User.findByPk(id);
        if(!user){
            return null;
        }
        await user.destroy();
        return true;
    }
}

export default new UserRepository();
