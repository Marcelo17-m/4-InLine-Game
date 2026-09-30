import { statsApiService } from "../../container.js";

export const getRequestStats = async (req, res) => {
    res.json(await statsApiService.getRequestStats());
};

export const getResponseTimeStats = async(req,res)=>{
    res.json(await statsApiService.getResponseTimeStats());
}

export const getStatusCodeStats = async(req,res)=>{
    res.json(await statsApiService.getStatusCodeStats());
}

export const getPopularEndpointStats = async(req,res)=>{
    res.json(await statsApiService.getPopularEndpointsStats());
}