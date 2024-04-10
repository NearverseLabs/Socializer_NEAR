import { Request as ExpressRequest } from 'express';
import { ObjectId } from 'mongoose';

export type Payload = { userId: ObjectId };
export type Request = ExpressRequest & Payload;

export type NetworkType = {
  name: string;
  icon: string;
};

export type TokenType = {
  _id: string;
  id: string;
  name: string;
  contract: string;
  method: string;
  balance: number;
  yocto_near: string;
  token: number;
  minimum: number;
};

export type TxType = {
  transaction_hash: string;
  sender: string;
  receiver: string;
  token: string;
  amount: number;
  type:string;
  ft?: object;
};

export type CampaignType = {
  id: string;
  _id: string;
  reward: string;
  social: string;
  status: string;
  poster: string;
  accountId: string;
  post_link: string;
  total_reward: string;
  participants: string;
  result: string;
  winners: number;
  ends: any;
  requirements: any;
};

export type TxHisType = {
  no: number;
  amount: string;
  hash: string;
  type: string;
  date: string;
};