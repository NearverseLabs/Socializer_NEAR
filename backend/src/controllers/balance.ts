import { Response } from 'express';
import { Request, TxType } from '../types';
import Balances from '../models/Balances';
import Campaigns from '../models/Campaigns';
import Participants from '../models/Participants';
import RafflesHistory from '../models/RafflesHistory';
import BalanceHistory from '../models/BalanceHistory';
import { connect, Contract, Account, utils } from "near-api-js";
import { nearConfig, keyStore, ADMIN_ADDRESS } from '../config';

const sendNearTokens = async (account: Account, receiver: string, amount: any, token: string) => {
    try {
        const amt = utils.format.parseNearAmount(amount)
        //@ts-ignore
        const { transaction } = await account.sendMoney(receiver, amt);
        console.log(`Transferred ${amount} NEAR tokens to ${receiver}`);
        const txData: TxType = {
            transaction_hash: transaction.hash,
            sender: transaction.signer_id,
            receiver: transaction.receiver_id,
            token,
            amount,
            type: "Withdrawal"
        }
        const newBalanceHis = new BalanceHistory(txData);
        newBalanceHis.save();
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }

}

const sendTokens = async (contract: Contract, receiver: string, amount: string, token: string) => {
    console.log(1000)
    try {
        //@ts-ignore
        // const { transactionHash, from, to } = 
        await contract.ft_transfer({
            args: {
                receiver_id: receiver,
                amount,
                memo: 'Token transfer',
            },
            gas: '300000000000000',
            amount: 1,
        });
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

export const getTokenBalance = async (contract: any, accountId: string) => {
    //@ts-ignore
    const balance = await contract.ft_balance_of({ account_id: accountId });
    return balance;
}

export const withdraw = async (req: Request, res: Response) => {
    try {
        const { accountId, amount, token, } = req.body;

        const user = await Balances.findOne({ accountId, token });

        if (!user)
            return res.json({ error: "AccountId is not valid " });

        if (amount > user.balance)
            return res.json({ error: "Your Balance is not enough" });

        const near = await connect({ ...nearConfig, keyStore });
        const account = await near.account(ADMIN_ADDRESS);

        //@ts-ignore
        const contract = new Contract(account, user.token.contract, {
            viewMethods: ['ft_balance_of'],
            changeMethods: [user.token.method],
        });

        const receiver = accountId;

        const amt = user.token.id === "NEAR" ? amount : BigInt(amount * user.token.yocto_near);

        const result = user.token.id === "NEAR" ?
            await sendNearTokens(account, receiver, amt.toString(), user.token._id) : await sendTokens(contract, receiver, amt.toString(), user.token._id);
        console.log('Transaction result:', result);

        if (result)
            await Balances.updateOne({ accountId, token }, { balance: user.balance - amount });
        else
            return res.json({ error: ` You must register for the <${user.token.contract}> contract before withdrawing.`, code: 404 });

        return res.json({ data: "success" });

    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
};


export const getStatus = async (req: Request, res: Response) => {
    try {
        const active_wallets = await Balances.aggregate([
            {
                $group: {
                    _id: '$accountId',
                    count: { $sum: 1 },
                },
            },
        ]);

        const campaigns = await Campaigns.find({ status: "expired" });
        const participants = await Participants.find({ finished: true });
        const total = participants.reduce((sum, row) => {
            const { like, follow, repost, comment, human } = row;
            const trueCount = Object.values({ like, follow, repost, comment, human }).reduce((count, value) => value ? count + 1 : count, 0);
            return sum + trueCount;
        }, 0);

        const near_rewards = campaigns.reduce((sum, item: any) => item.token?.id === "NEAR" ? ((Number(item.amount) * Number(item.winners)) + sum) : sum, 0);
        const neko_rewards = campaigns.reduce((sum, item: any) => item.token?.id === "NEKO" ? ((Number(item.amount) * Number(item.winners)) + sum) : sum, 0);

        res.json({
            data: {
                near_rewards: Number(near_rewards.toFixed(1)),
                neko_rewards: Number(neko_rewards.toFixed(1)),
                campaigns_count: campaigns.length,
                active_wallets: active_wallets.length,
                total_transactions: total
            }
        })

    } catch (error: any) {
        console.error(`error`, error);
        return res.status(400).json('Interanal server error');
    }
};
