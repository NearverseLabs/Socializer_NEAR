import { model, Schema } from 'mongoose';

const txHistorySchema: Schema = new Schema({
    transaction_hash: {
        type: String, require: true, unique: true
    },
    block_timestamp: {
        type: String, require: true
    },
    block: {
        type: Object, require: true
    },
    actions: {
        type: Array, require: true
    },
    token_txns: {
        type: Boolean, default: false
    },
},
    { timestamps: true }
);

const TxHistory = model('tx_histories', txHistorySchema);

export default TxHistory;