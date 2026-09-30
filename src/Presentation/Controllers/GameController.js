import {gameService} from '../../container.js';
import { handleResult } from '../../Middleware/handleResult.js';

export const create = async (req, res, next)=>{
    const {name, rules} = req.body;
    const result = await gameService.createGame({name, rules, creatorId: req.user.id});
    //aqui como necesitamos una respuesta especifica tenemos que hacerla manual
    //Distinta al objeto que devuelve el service

    if (result.isErr()) return handleResult(res, result);
    return res.status(201).json({message: 'Game created successfully', game_id: result.value.id});
};

export const getAll = async (req, res, next)=>{
    const games = await gameService.getAllGames();
    res.json(games);
};

export const getById = async (req, res, next)=>{
    const result = await gameService.getGameById(req.params.id);
    handleResult(res, result);
};

export const update = async (req, res, next)=>{
    const result = await gameService.updateGame(req.params.id, req.body);
    handleResult(res, result);
};

export const deleteG = async (req, res, next)=>{
    const result = await gameService.deleteGame(req.params.id);
    if(result.isErr()) return handleResult(res, result);
    res.status(204).send();
};

export const join = async (req, res, next)=>{
    const result = await gameService.joinGame({gameId: req.body.game_id, userId: req.user.id});
    handleResult(res, result);
};

export const start = async (req, res, next)=>{
    const result = await gameService.startGame({gameId: req.body.game_id, userId: req.user.id});
    handleResult(res, result);
};

export const leave = async (req, res, next)=>{
    const result = await gameService.leaveGame({gameId: req.body.game_id, userId: req.user.id});
    handleResult(res, result);
};

export const end = async (req, res,next)=>{
    const result = await gameService.endGame({gameId: req.body.game_id, userId: req.user.id});
    handleResult(res, result);
};

export const getState = async (req, res, next)=>{
    const result = await gameService.getGameState(req.body.game_id);
    handleResult(res, result);
};

export const getPlayers = async (req, res, next)=>{
    const result = await gameService.getGamePlayers(req.body.game_id);
    handleResult(res, result);
};

export const getCurrentPlayer = async (req, res, next)=>{
    const result = await gameService.getCurrentPlayer(req.body.game_id);
    handleResult(res, result);
};

export const getTopCard = async (req, res, next)=>{
    const result = await gameService.getTopCard(req.body.game_id);
    handleResult(res, result);
};

export const getScores = async (req, res, next)=>{
    const result = await gameService.getGameScores(req.body.game_id);
    handleResult(res, result);
};

export const playCard = async (req, res, next) => {
    const {game_id, card, chosen_color} = req.body;
    const result = await gameService.playCard({
        gameId: game_id,
        userId: req.user.id,
        cardString: card,
        chosenColor: chosen_color,
    });
    handleResult(res, result);
};

export const drawCard = async (req, res, next) =>{
    const result = await gameService.drawCard({gameId:req.body.game_id, userId:req.user.id});
    handleResult(res, result);
};

export const sayUno = async (req, res, next)=>{
    const result = await gameService.sayUno({gameId:req.body.game_id, userId:req.user.id});
    handleResult(res, result);
};

export const catchUno = async (req, res, next)=>{
    const result = await gameService.catchUno({
        gameId: req.body.game_id,
        userId: req.user.id,
        targetUserId: req.body.target_user_id,
    });
    handleResult(res, result);
};

export const getOwnHand = async (req, res, next)=>{
    const result = await gameService.getOwnHand({gameId:req.body.game_id, userId:req.user.id});
    handleResult(res, result);
};

export const getHistory = async (req, res, next)=>{
    const result = await gameService.getGameHistory(req.body.game_id);
    handleResult(res, result);
};

export const getStateDetail = async(req,res,next)=>{
    const result = await gameService.getGameStateDetail({
        gameId: req.body.game_id,
        userId: req.user.id,
    });
    handleResult(res, result);
};

export const suggestPlayableCard = async (req, res, next) => {
    const result = await gameService.suggestPlayableCard({
        gameId: req.body.game_id,
        userId: req.user.id,
    });
    handleResult(res, result);
};
