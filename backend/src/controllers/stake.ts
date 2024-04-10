import axios from 'axios';
import { Response } from 'express';
import { Request } from '../types';

export const get = async (req: Request, res: Response) => {
    try {
        const { owner_id, contract_id, limit } = req.query;
        const nfts = await axios.get(
            `https://api-v2-mainnet.paras.id/token?owner_id=${owner_id}&contract_id=${contract_id}&__limit=${limit}`
        );
        res.json(nfts.data);
    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
};

export const getNFTInfo = async (req: Request, res: Response) => {
    try {
        const { token_id, contract_id } = req.query;
        const nfts = await axios.get(
            `https://api-v2-mainnet.paras.id/token?token_id=${token_id}&contract_id=${contract_id}`
        );
        res.json(nfts.data);
    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
}