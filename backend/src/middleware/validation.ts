import * as Joi from 'joi';
import * as Validation from 'express-joi-validation';
import { Request, Response, NextFunction } from 'express';

export const V = Validation.createValidator({ passError: true });

export const RetrunValidation = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error && error.error && error.value && error.type) {
    return res.status(400).json(error.error.toString().replace('Error: ', ''));
  } else {
    return next(error);
  }
};

export const Validator = {
  ObjectId: Joi.object({
    id: Joi.string().min(24).max(24).required()
  }),
  UserId: Joi.object({
    userId: Joi.string().min(24).max(24).required()
  }),
  AccountId: Joi.object({
    accountId: Joi.string().required()
  }),
  Token: {
    Get: Joi.object({
      accountId: Joi.string().required(),
    })
  },
  Campaign: {
    Poster: Joi.object({
      post_link: Joi.string().required(),
    }),
    Create: Joi.object({
      accountId: Joi.string().required(),
      requirements: Joi.array().required(),
      username: Joi.string().required(),
      post_link: Joi.string().required(),
      amount: Joi.number().required(),
      token: Joi.string().required(),
      winners: Joi.number().required(),
      total_reward: Joi.string().required(),
      duration_hr: Joi.string().required(),
      duration_min: Joi.string().required(),
      tokens: Joi.array().required(),
      error: Joi.string().allow(null, "").required(),
      balance: Joi.any().required(),
      loading: Joi.any().required(),
      minimum: Joi.number().required(),
      notification: Joi.any().required(),
    }),
    Verify: Joi.object({
      accountId: Joi.string().required(),
      id: Joi.string().allow(null, "").required(),
    }),
  },
  Balance: {
    Withdraw: Joi.object({
      accountId: Joi.string().required(),
      amount: Joi.number().required(),
      token: Joi.string().required(),
    }),
  }

};
