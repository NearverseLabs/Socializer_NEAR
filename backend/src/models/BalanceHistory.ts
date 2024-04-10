import { model, Schema } from 'mongoose';

const balanceHistorySchema: Schema = new Schema({
    token: {
        type: Schema.Types.ObjectId,
        ref: 'tokens'
    },
    transaction_hash: {
        type: String, require: true,
    },
    sender: {
        type: String, require: true
    },
    receiver: {
        type: String, require: true
    },
    amount: {
        type: Number, require: true
    },
    type: {
        type: String, require: true
    },
    ft: {
        type: Object
    },
},
    { timestamps: true }
);

balanceHistorySchema.pre('find', function () {
    this.populate('token', ['id', 'name']);
})

const balanceHistory = model('balance_histories', balanceHistorySchema);

export default balanceHistory;