import { ApiStats } from "../Models/index.js";

class ApiStatsRepository {
    async create(data){
        return ApiStats.create(data);
    }

    async findAll(){
        return ApiStats.findAll();
    }
}

export default new ApiStatsRepository();
