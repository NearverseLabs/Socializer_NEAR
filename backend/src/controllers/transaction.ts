import axios from 'axios';
import { Response } from 'express';
import bigInt from 'big-integer';

import Tokens from '../models/Tokens';
import Balances from '../models/Balances';
import TxHistory from '../models/TxHistory';
import BalanceHistory from '../models/BalanceHistory';

import { Request, TxType } from '../types';
import { ADMIN_ADDRESS, LIVE_TIME } from '../config';
import { utils } from "near-api-js";

//@ts-ignore
export const getTxHistory = async (
    accountId: any,
    per_page: number = 25,
    token_txn: boolean = false,
    page: number = 1
) => {
    try {
        const url = `https://api3.nearblocks.io/v1/account/${accountId}/${token_txn ? "ft-" : ""}txns`;
        const response = await axios.get(
            url,
            {
                params: {
                    order: "desc",
                    page,
                    per_page,
                },
            }
        );
        if (!response?.data?.txns.length) return false;
        return response?.data.txns;

    } catch (error) {
        console.error(error.response);
        return false;
    }
};

export const getTxIdHistory = async (
    tx_id: any,
) => {
    try {
        const response = await axios.get(
            `https://api3.nearblocks.io/v1/txns/${tx_id}`
        );
        if (!response.data?.txns.length) return false;
        return response.data.txns[0];

    } catch (error) {
        console.error(error.response);
        return false;
    }
};

export const checkBalance = async (token_txns: boolean) => {
    const histories = await getTxHistory(ADMIN_ADDRESS, 25, token_txns);
    if (!histories) return;

    // if (token_txns) {
    //     const temp = histories.map((row: any, ind: number) => ({ hash: row.transaction_hash, ind }));
    //     console.log("🚀 ~ checkBalance ~ temp:", temp)
    // }

    const lastone = await TxHistory.find({ token_txns }).sort({ block_timestamp: -1 }).limit(1);
    if (!lastone.length) return;

    const index = histories.findIndex((item: any) => item.transaction_hash === lastone[0].transaction_hash);
    if (index === 0) return;

    const data = histories.slice(0, index);
    console.log(`${token_txns ? "Token" : "Near"} deposited:`, data.length);

    if (token_txns) {
        await saveTokenTxHis(data);
    } else {
        await saveNearTxHis(data);
    }

    const sorted = data.sort((a: any, b: any) => b.block_timestamp - a.block_timestamp).reverse();
    const result = sorted.map((item: any) => ({ ...item, token_txns, }))

    await TxHistory.insertMany(result);
    return;
}

export const saveNearTxHis = async (data: any) => {
    const token: any = await Tokens.findOne({ id: "NEAR" });
    data.forEach(async (row: any) => {
        if (row.predecessor_account_id === token.contract && row.receiver_account_id === ADMIN_ADDRESS) {
            const tx = await getTxIdHistory(row.transaction_hash);
            if (tx && tx.actions[0].method === token.method) {
                const { transaction_hash, receiver_account_id } = row;
                const number: any = bigInt(tx.actions_agg.deposit);
                const amount = Number(utils.format.formatNearAmount(number.value, 4));

                const txData: TxType = {
                    transaction_hash,
                    sender: tx.signer_account_id,
                    receiver: receiver_account_id,
                    token: token._id,
                    type: "Deposit",
                    amount,
                }
                const newBalanceHis = new BalanceHistory(txData);
                newBalanceHis.save();

                if (amount !== 0) {
                    const query = {
                        token: token._id,
                        accountId: tx.signer_account_id,
                    }
                    const user = await Balances.findOne(query);
                    if (user) {
                        await Balances.updateOne(query, { balance: user.balance + amount })
                    } else {
                        const newDoc = new Balances(query);
                        newDoc.balance = amount;
                        newDoc.save();
                    }
                }
            }
        }
    });
}

export const saveTokenTxHis = async (data: any) => {
    data.forEach(async (row: any) => {
        const { transaction_hash, involved_account_id, affected_account_id, ft, delta_amount, cause } = row;
        if (cause === "TRANSFER") {
            const token: any = await Tokens.findOne({ contract: ft.contract });
            if (token) {
                // const amt = Number(utils.format.formatNearAmount(amount, 4));
                const amt: number = Number((Number(delta_amount) / Number(token.yocto_near)).toFixed(4));
                console.log(delta_amount, "==>", amt);
                const txData: TxType = {
                    transaction_hash,
                    sender: involved_account_id,
                    receiver: affected_account_id,
                    token: token._id,
                    amount: Math.abs(amt),
                    type: amt > 0 ? "Deposit" : "Withdrawal",
                    ft,
                }

                const newBalanceHis = new BalanceHistory(txData);
                await newBalanceHis.save();
                if (amt !== 0) {
                    const query = {
                        token: token._id,
                        accountId: involved_account_id,
                    }
                    const user = await Balances.findOne(query);
                    if (user) {
                        await Balances.updateOne(query, { balance: user.balance + amt })
                    } else {
                        const newDoc = new Balances(query);
                        newDoc.balance = amt;
                        newDoc.save();
                    }
                }
            }
        }
    });
}

export const get = async (req: Request, res: Response) => {
    try {
        const { accountId } = req.query;
        if (!accountId) return res.status(402).json('AccountId is required');

    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
};
