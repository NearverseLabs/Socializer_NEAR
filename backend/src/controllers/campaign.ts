import axios from 'axios';
import http from 'http';
import https from 'https';
import moment from 'moment';
// import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { connect, Contract, } from "near-api-js";


import Tokens from '../models/Tokens';
import Balances from '../models/Balances';
import Campaigns from '../models/Campaigns';
import Participants from '../models/Participants';
import RafflesHistory from '../models/RafflesHistory';
import BalanceHistory from '../models/BalanceHistory';

import { Request, CampaignType, TxType } from '../types';
import { RequirementsOptions, CampaignStatusType, nearConfig, keyStore, ADMIN_ADDRESS, } from '../config';


// async function token(user: any, res: Response) {
//   const payload: Payload = {
//     userId: user._id
//   };

//   jwt.sign(
//     payload,
//     JWTSECRET,
//     { expiresIn: JWTEXPIRATION },
//     async (err, token) => {
//       if (err) throw err;
//       return res.json({ token, user, bot: 200 });
//     }
//   );
// }

const getCampaignId = (num: number) => {
  if (num < 1000)
    return ("000" + num).slice(
      num.toString().length - 1,
      ("000" + num).toString().length
    );
  return num;
};

const checkLinkValidity = async (link: string) => {
  const protocol = link.startsWith('https') ? https : http;

  return new Promise((resolve, reject) => {
    protocol
      .get(link, (response: any) => {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .on('error', (error: any) => {
        reject(error);
      });
  });
};

const getSocialContent = async ({ blockHeight, accountId }: { blockHeight: number, accountId: string }) => {
  const body = {
    blockHeight,
    keys: [
      `${accountId}/post/main`
    ]
  }
  const res = await axios.post("https://api.near.social/get", body);
  if (!res?.data) return false
  return res?.data[accountId].post.main;
}

const getParams = (link: string) => {
  const data = link.split("?")[1].split("&");
  if (data.length == 0) return false;
  const accountId = data[0].split("=")[1];
  const blockHeight = Number(data[1].split("=")[1]);
  return { accountId, blockHeight };
}

const getEndsIn = (createdAt: string, duration_hr: string, duration_min: string) => {
  const now = moment();
  const targetDate = moment(createdAt).add(duration_hr, 'hour').add(duration_min, 'minutes');
  const endsin = moment.duration(targetDate.diff(now));
  const hrs = endsin.hours();
  const mins = endsin.minutes();
  const secs = endsin.seconds();
  return {
    hrs,
    mins,
    secs,
    endsin: targetDate
  }
}

const getStateSocial = async (action: any, { blockHeight, accountId }: { blockHeight: number, accountId: string }) => {
  try {
    const body = {
      action,
      "key": {
        "type": "social",
        "path": `${accountId}/post/main`,
        blockHeight,
      }
    }
    const res = await axios.post("https://api.near.social/index", body);
    return res?.data
  } catch (err) {
    console.error(err);
    return false;
  }
}

const getFollowState = async (accountId: string) => {
  try {
    const body = {
      "keys": [
        `*/graph/follow/${accountId}`
      ],
      "options": {
        "return_type": "BlockHeight",
        "values_only": true
      }
    }
    const res = await axios.post("https://api.near.social/keys", body);
    return res?.data
  } catch (err) {
    console.error(err);
    return false;
  }
}

const checkHuman = async (accountId: string) => {
  try {
    const near = await connect({ ...nearConfig, keyStore });
    const account = await near.account(accountId);

    //@ts-ignore
    const contract = new Contract(account, "registry.i-am-human.near", {
      viewMethods: ['sbt_tokens_by_owner'],
    });

    //@ts-ignore
    const state = await contract.sbt_tokens_by_owner({
      account: accountId, issuer: "fractal.i-am-human.near",
    });

    return state?.[0]?.[1]?.[0];
  } catch (err) {
    console.error("🚀 ~ file: campaign.ts:141 ~ checkHuman ~ err:", err)
    return false;
  }

}

const raffles = (array: any[], count: number) => {
  // Shuffle the array
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  // Get the first 5 elements
  const randomItems = array.slice(0, count);
  return randomItems;
}

const recordBalHistory = async (params: TxType) => {
  const newBalanceHis = new BalanceHistory(params);
  await newBalanceHis.save();
  return;
}

export const setBalance = async (params: any, flag: boolean) => {
  const { accountId, token, type, amount, campaign } = params;
  const rafflesHis = new RafflesHistory(params);
  await rafflesHis.save();

  const user = await Balances.findOne({ accountId, token });
  if (user)
    await Balances.updateOne({ accountId, token }, { balance: user.balance + amount });
  else {
    const balance = new Balances({ accountId, token, balance: amount });
    await balance.save();
  }
  const near = await connect({ ...nearConfig, keyStore });
  const account = await near.account(ADMIN_ADDRESS)
  const txData: TxType = {
    transaction_hash: "",
    sender: account.accountId,
    receiver: accountId,
    token,
    amount,
    type: flag ? "Winnings" : "Reward Returned"
  }
  await recordBalHistory(txData);
  return;
}

const decideWinners = async (campaign: any) => {
  const { _id, accountId, token, winners, amount } = campaign;
  const participants = await Participants.find({ campaign: _id, finished: true });
  let params = {
    accountId,
    token: token._id,
    amount: (winners * Number(amount.toFixed(4))),
    type: "return",
    campaign: _id
  }
  if (participants.length) {
    const winner = participants.length > winners ? raffles(participants, winners) : participants;

    if (participants.length < winners) {
      params.amount = (winners - participants.length) * Number(amount.toFixed(4));
      await setBalance(params, false);
    }

    Promise.all(winner.map(async (row: any) => {
      params.accountId = row.accountId;
      params.amount = amount;
      params.type = "win";
      await setBalance(params, true);
      await Participants.findByIdAndUpdate(row._id, { win: true });
    }));

    return;
  } else {
    return await setBalance(params, false);
  }
}

export const checkCampaign = async () => {
  try {
    const allList = await Campaigns.find({ status: CampaignStatusType.live });
    allList.forEach(async (row: any) => {
      const { _id, createdAt, duration_hr, duration_min } = row;
      const time = getEndsIn(createdAt, duration_hr, duration_min);
      if (time.secs < 0) {
        const campaign = await Campaigns.findByIdAndUpdate(_id, { status: CampaignStatusType.expired }, { upsert: true, new: true });
        await decideWinners(campaign);
      }
    });
  } catch (err) {
    console.error(err);
    return err;
  }
}

export const getPoster = async (req: Request, res: Response) => {
  try {
    const { post_link } = req.body;

    if ((post_link.indexOf("https://near.social/") !== 0 && post_link.indexOf("https://near.org/") !== 0) || post_link.indexOf("accountId=") === -1 || post_link.indexOf("&blockHeight") === -1)
      return res.json({ error: "Please enter the post link exactly" });

    if (post_link.indexOf("Comment.Page") !== -1) {
      return res.json({ error: "Comments links aren’t supported. Try giving a post link instead" });
    }

    const isValid = await checkLinkValidity(post_link)
    if (!isValid) return res.json({ error: "Please enter the post link exactly" });

    const params: any = getParams(post_link);
    if (!params) return res.json({ error: "Please enter the post link exactly" });

    res.json(params);
  } catch (error) {
    console.error(error);
    return res.status(400).json('Interanal server error');
  }
}

export const create = async (req: Request, res: Response) => {
  try {
    const {
      accountId,
      requirements,
      post_link,
      amount,
      token,
      winners,
      duration_hr, duration_min
    } = req.body;

    let regex = new RegExp('\\b' + "https" + '\\b', 'g');
    let matches = post_link.match(regex);

    if ((post_link.indexOf("https://near.social/") !== 0 && post_link.indexOf("https://near.org/") !== 0) || post_link.indexOf("accountId=") === -1 || post_link.indexOf("&blockHeight") === -1 || (matches && matches.length > 1))
      return res.json({ error: "Please enter the post link exactly" });

    if (post_link.indexOf("Comment.Page") !== -1) {
      return res.json({ error: "Comments links aren’t supported. Try giving a post link instead" });
    }

    const isValid = await checkLinkValidity(post_link)
    if (!isValid) return res.json({ error: "Please enter the post link exactly" });

    const params: any = getParams(post_link);
    if (!params) return res.json({ error: "Please enter the post link exactly" });

    const content = await getSocialContent(params);
    if (!content) return res.json({ error: "Please enter the post link exactly" });

    const balance = await Balances.find({ accountId });
    if (!balance.length) return res.json({ error: "Your Balance is not enough. Please deposit tokens on profile." });

    const nearBalance = balance.find((item: any) => item.token.id === "NEAR");
    if (!nearBalance || nearBalance.balance < (token === "NEAR" ? (amount * winners) + nearBalance.token.fee : nearBalance.token.fee)) return res.json({ error: `You need to ${nearBalance.token.fee} near to create a campaign. Please deposit tokens on profile.` });

    const myBalance = balance.find((item: any) => item.token.id === token);
    if (!myBalance || myBalance.balance < (amount * winners)) return res.json({ error: "Your Balance is not enough. Please deposit tokens on profile." });

    if ((Number(duration_hr) == 0 && Number(duration_min) == 0) ||
      (Number(duration_hr) < 0 || Number(duration_hr) > 72) ||
      (Number(duration_min) < 0 || Number(duration_min) > 50))
      return res.json({ error: "Please select duration time exactly" });

    const reqirementsArray: any = [];

    requirements.forEach((row: any) => {
      const item = RequirementsOptions.find((item: any) => item.value === row.value);
      reqirementsArray.push(item);
    });

    let query = req.body;

    const lastOne = await Campaigns.findOne().sort({ createdAt: -1 });
    if (!lastOne || !lastOne.id)
      query.id = "0001"
    else
      query.id = getCampaignId(Number(lastOne.id) + 1);

    query.requirements = reqirementsArray;
    query.token = myBalance.token._id;
    query.content = content;


    // query.duration_hr = "00";
    // query.duration_min = "15";

    const newCompaign = new Campaigns(query);
    await newCompaign.save();

    const FEE = nearBalance.token.fee;

    await Balances.findByIdAndUpdate(nearBalance._id, { balance: nearBalance.balance - (token === "NEAR" ? (amount * winners) + FEE : FEE) });
    if (token !== "NEAR")
      await Balances.findByIdAndUpdate(myBalance._id, { balance: myBalance.balance - (amount * winners) });

    const near = await connect({ ...nearConfig, keyStore });
    const account = await near.account(ADMIN_ADDRESS)

    let txData: TxType = {
      transaction_hash: "",
      sender: accountId,
      receiver: account.accountId,
      token:myBalance.token._id,
      amount: FEE,
      type: "Campaign Fee"
    }
    await recordBalHistory(txData);

    txData.amount = amount * winners;
    txData.type = "Reward Spent";
    await recordBalHistory(txData);

    return res.json({ data: "success" });

  } catch (err) {
    console.error(err);
    return res.status(400).json('Interanal server error');
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    const { accountId, type }: any = req.query;
    const campaigns = await Campaigns.find({ status: type }).sort({ _id: -1 });
    let data: any = [];
    if (campaigns.length)
      data = await Promise.all(campaigns.map(async (item: any) => {
        const { _id, id, amount, content, post_link, status, token, winners, createdAt, duration_hr, duration_min, requirements } = item;
        const params: any = getParams(post_link);
        const time = getEndsIn(createdAt, duration_hr, duration_min);
        const social = JSON.parse(content)["text"];
        let result = "not";
        const participants = await Participants.find({ campaign: _id, finished: true });
        const participant = participants.find((e) => e.accountId === accountId);
        if (participant) {
          if (type !== "live") {
            if (participant.win)
              result = "won"
            else if (!participant.win)
              result = "lost"
          }
        } else if (type === "live") {
          result = "won"
        }

        const temp: CampaignType = {
          _id,
          id,
          accountId: item.accountId,
          reward: `${amount} ${token.id}`,
          total_reward: `${Number((amount * winners).toFixed(4))} ${token.id}`,
          social: `${social.slice(0, 40)}...`,
          participants: participants.length.toString(),
          post_link,
          poster: params.accountId,
          requirements,
          status,
          winners,
          ends: time.endsin,
          result,
        }
        return temp;
      }));

    return res.json({ data });
  } catch (err) {
    console.error(err);
    return res.status(400).json('Interanal server error');
  }
};

export const verify = async (req: Request, res: Response) => {
  try {
    const { accountId, id } = req.body;
    const campaign = await Campaigns.findById(id);
    if (!campaign || !campaign.requirements.length || campaign.status !== "live") return res.json({ error: "This Campaign is not exists" });
    if (campaign.accountId === accountId) return res.json({ error: `You can't participate in the lottery.` });

    const { post_link, requirements } = campaign;

    const params: any = getParams(post_link);
    if (!params) return res.json({ error: "Please enter the post link exactly" });

    const query: any = {
      like: false,
      follow: false,
      repost: false,
      comment: false,
      human: false,
      finished: true
    }

    console.log(params, "===>verify");

    await Promise.all(requirements.map(async (row: any, key: any) => {
      if (row.value === "follow") {
        const datas = await getFollowState(params.accountId);
        if (datas) {
          const index = Object.keys(datas).findIndex((item: any) => item === accountId);
          if (index !== -1) query[row.value] = true;
          else query.finished = false;
        } else {
          query.finished = false;
        }
      } else if (row.value === "human") {
        const state = await checkHuman(accountId);
        if (state) {
          query[row.value] = true;
        } else {
          query.finished = false;
        }
      } else {
        const datas = await getStateSocial(row.value, params);
        if (datas && datas.length) {
          const index = datas.findIndex((item: any) => item.accountId === accountId);
          if (index !== -1) query[row.value] = true;
          else query.finished = false;
        } else {
          query.finished = false;
        }
      }
      return query;
    }));
    await Participants.findOneAndUpdate({ accountId, campaign: id }, query, { upsert: true, new: true });
    return res.json({ data: query });

  } catch (err) {
    console.error(err);
    return res.status(400).json('Interanal server error');
  }
};

export const getVerify = async (req: Request, res: Response) => {
  try {
    const { accountId, id } = req.query;
    if (!accountId || !id)
      return res.json({ error: "AccountId is required" });
    const campaign = await Campaigns.findById(id);
    if (!campaign || !campaign.requirements.length) return res.json({ error: "This Campaign is not exists" });
    const participant = await Participants.findOne({ accountId, campaign: id });
    const query: any = {
      like: false,
      follow: false,
      repost: false,
      comment: false,
    }
    return res.json({ data: participant ?? query });
  } catch (err) {
    console.error(err);
    return res.status(400).json('Interanal server error');
  }
};

export const getWinners = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id)
      return res.json({ error: "Id is required" });
    const winners = await Participants.find({ campaign: id, finished: true, win: true });
    return res.json({ data: winners });
  } catch (err) {
    console.error(err);
    return res.status(400).json('Interanal server error');
  }
};


export const getLeaderList = async (req: Request, res: Response) => {
  try {
    const { type, time } = req.query;
    if ((type !== "users" && type !== "creators") && (time !== "all" && time !== "weekly" && time !== "monthly"))
      return res.json({ error: "type and time value is invalid" });

    const lastWeek = moment().subtract(1, 'week');
    const now = moment();

    // Get the date a month ago
    const lastMonth = moment().subtract(1, 'month');

    const query = time === "all" ? {} : {
      createdAt: {
        $gte: time === "weekly" ? lastWeek.toDate() : lastMonth.toDate(),
        $lte: now.toDate()
      }
    }
    if (type === "users") {
      const participants = await Participants.aggregate([
        {
          $match: query
        },
        { $group: { _id: "$accountId", participated: { $sum: 1 } } }
      ]).sort({ participated: -1 }).limit(10);

      const result = await Promise.all(participants.map(async (item, index: number) => {
        const history1 = await BalanceHistory.find({ $or: [{ sender: item._id }, { receiver: item._id }] });
        const history2 = await RafflesHistory.find({ accountId: item._id });
        return { no: index + 1, accountId: item._id, participated: item.participated.toString(), txs: (history1.length + history2.length).toString() };
      }))

      return res.json({ data: result });
    } else {
      const campaigns = await Campaigns.aggregate([
        {
          $match: query
        },
        {
          $lookup: {
            from: 'participants',
            localField: '_id',
            foreignField: 'campaign',
            as: 'participants'
          }
        },
        { $group: { _id: "$accountId", created: { $sum: 1 }, participants: { $sum: { $size: '$participants' } } } },
      ]).sort({ participants: -1 }).limit(10);
      const result = campaigns.map((item, index: number) => ({ no: index + 1, accountId: item._id.length > 20 ? `${item._id.slice(0, 4)}...${item._id.slice(-4)}` : item._id, participants: item.participants.toString(), created: item.created.toString() }));
      return res.json({ data: result });
    }

  } catch (err) {
    console.error(err);
    return res.status(400).json('Interanal server error');
  }
};
