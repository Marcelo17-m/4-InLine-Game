import {scoreService} from '../../container.js';
import { handleResult } from '../../Middleware/handleResult.js';

export const create = async(req,res,next)=>{
    const result = await scoreService.createScore(req.body);
    handleResult(res, result, 201);
};

export const getAll = async (req, res, next)=>{
    const scores = await scoreService.getAllScores();
    res.json(scores);
};

export const getById = async (req, res, next) => {
    const result = await scoreService.getScoreById(req.params.id);
    handleResult(res, result);
};

export const update = async (req, res,next)=>{
    const result = await scoreService.updateScore(req.params.id, req.body);
    handleResult(res, result);
};

export const deleteS = async (req, res, next)=>{
    const result = await scoreService.deleteScore(req.params.id);
    if (result.isErr()) return handleResult(res,result);
    res.status(204).send();
};