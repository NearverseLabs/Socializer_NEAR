import { model, Schema } from 'mongoose';

const rafflesHistorySchema: Schema = new Schema({
    accountId: {
        type: String, require: true
    },
    campaign: {
        type: Schema.Types.ObjectId,
        ref: 'campaigns'
    },
    token: {
        type: Schema.Types.ObjectId,
        ref: 'tokens'
    },
    type: {
        type: String, default: ""
    },
    amount: {
        type: Number, require: true
    },
},
    { timestamps: true }
);

const rafflesHistory = model('raffles_histories', rafflesHistorySchema);

export default rafflesHistory;