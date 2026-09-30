import {cardService} from '../../container.js';
import { handleResult } from '../../Middleware/handleResult.js';

export const create = async (req, res, next) => {
    const result = await cardService.createCard(req.body);
    handleResult(res, result, 201);
};

export const getAll = async (req, res, next) => {
    const cards = await cardService.getAllCards();
    res.json(cards);
};

export const getById = async (req, res, next) => {
    const result = await cardService.getCardById(req.params.id);
    handleResult(res, result);
};

export const update = async (req, res, next) => {
    const result = await cardService.updateCard(req.params.id, req.body);
    handleResult(res, result);
};

export const deleteC = async (req,res,next)=>{
    const result = await cardService.deleteCard(req.params.id);
    if (result.isErr()) return handleResult(res, result);
    res.status(204).send();
};