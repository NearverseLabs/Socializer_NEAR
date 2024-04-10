import moment from 'moment';
import { CronJob } from 'cron';
import { Response } from 'express';
import { expression } from 'joi';
import { Request } from '../types';
import Tokens from '../models/Tokens';
import TxHistory from '../models/TxHistory';
import Campaigns from '../models/Campaigns';
import { ADMIN_ADDRESS, LIVE_TIME } from '../config';
import { getTxHistory, checkBalance } from './transaction';
import { checkCampaign } from './campaign';

const TOKENS = [
    {
        id: "NEAR",
        name: "$NEAR",
        contract: "transfer-near.near",
        method: "transfer_near",
        yocto_near: "1000000000000000000000000",
        minimum: 2,
        fee: 0.1,
    },
    {
        id: "NEKO",
        name: "$NEKO",
        contract: "ftv2.nekotoken.near",
        method: "ft_transfer",
        yocto_near: "1000000000000000000000000",
        minimum: 1000,
        fee: 0,
    },
    {
        id: "NVRS",
        name: "$NVRS",
        contract: "rocketbois-reward.near",
        method: "ft_transfer",
        yocto_near: "1000000000000000000",
        minimum: 50000,
        fee: 0,
    },
]

export const token = async (req: Request, res: Response) => {
    try {
        await Tokens.deleteMany();
        await Tokens.insertMany(TOKENS);
        return res.json("success");
    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
};

export const txhistory = async (req: Request, res: Response) => {
    try {
        await TxHistory.deleteMany();
        const data = await getTxHistory(ADMIN_ADDRESS, 25);
        if (!data) return;
        const sorted = data.sort((a: any, b: any) => b.blockTimestamp - a.blockTimestamp).reverse();
        const result = sorted.map((item: any) => ({ ...item, token_txns: false }))
        await TxHistory.insertMany(result);

        const dataT = await getTxHistory(ADMIN_ADDRESS, 25, true);
        if (!dataT) return;
        const sortedT = dataT.sort((a: any, b: any) => b.blockTimestamp - a.blockTimestamp).reverse();
        const resultT = sortedT.map((item: any) => ({ ...item, token_txns: true }))
        await TxHistory.insertMany(resultT);
        return res.json("success");
    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
};

export const initCron = async (req?: Request, res?: Response) => {
    try {
        await checkBalance(false);
        await checkBalance(true);
        await checkCampaign();
        const job1 = new CronJob(LIVE_TIME as string, async () => {
            await checkBalance(false);
            await checkBalance(true);
            await checkCampaign();
        });
        job1.start();
        if (res)
            res.json("success");
    } catch (error: any) {
        console.error(`error`, error);
    }
}