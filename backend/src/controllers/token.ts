import moment from 'moment';
import { Response } from 'express';
import Tokens from '../models/Tokens';
import Balances from '../models/Balances';
import { getTokenBalance } from './balance';
import { connect, Contract, } from "near-api-js";
import BalanceHistory from '../models/BalanceHistory';
import { Request, TokenType, TxHisType } from '../types';
import { nearConfig, keyStore, ADMIN_ADDRESS } from '../config';

export const get = async (req: Request, res: Response) => {
    try {
        const { accountId, historyType }: any = req.query;
        if (!accountId) return res.status(402).json('AccountId is required');
        const balacnes = await Balances.find({ accountId });

        const near = await connect({ ...nearConfig, keyStore });
        const account = await near.account(accountId);

        const data = await Tokens.find();
        const result: TokenType[] = await Promise.all(data.map(async (item: any) => {
            const { _id, id, name, contract, method, yocto_near, minimum } = item;

            let temp: TokenType = {
                _id,
                id,
                name,
                contract,
                method,
                yocto_near,
                minimum,
                balance: 0,
                token: 0,
            }

            if (id !== "NEAR") {
                //@ts-ignore
                const ft_balance_of = new Contract(account, contract, {
                    viewMethods: ['ft_balance_of'],
                });

                const tokenBalance = await getTokenBalance(ft_balance_of, account.accountId);
                temp.token = tokenBalance;
            }

            if (balacnes.length) {
                temp.balance = balacnes.find((item: any) => item.token.id === id)?.balance ?? 0;
                temp.balance = Number(temp.balance.toFixed(4));
            }
            return temp;
        }));

        const query: any = {
            $or: [
                { sender: accountId, receiver: ADMIN_ADDRESS },
                { receiver: accountId, sender: ADMIN_ADDRESS },
            ]
        }
        if (historyType !== "All") {
            query.type = historyType
        }
        const tx = await BalanceHistory.find(query).sort({ createdAt: -1 });

        const txData = tx.map((row: any, index: number) => {
            const { amount, transaction_hash, sender, token, type, createdAt } = row;
            const date = moment(createdAt, "YYYYMMDD").fromNow();
            const txhis: TxHisType = {
                no: index + 1,
                amount: `${amount} ${token.id}`,
                hash: transaction_hash ? `https://nearblocks.io/txns/${transaction_hash}` : "",
                type,
                date,
            }
            return txhis
        })
        res.json({ token: result, history: txData });

    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
};
