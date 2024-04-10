import { model, Schema } from 'mongoose';

const balancesSchema: Schema = new Schema({
    token: {
        type: Schema.Types.ObjectId,
        ref: 'tokens'
    },
    accountId: {
        type: String, require: true
    },
    balance: {
        type: Number, default: 0
    }
},
    { timestamps: true }
);

balancesSchema.pre('find', function () {
    this.populate('token', ['id', 'name', 'contract', 'method', 'yocto_near', 'fee']);
});

balancesSchema.pre('findOne', function () {
    this.populate('token', ['id', 'name', 'contract', 'method', 'yocto_near', 'fee']);
});

const Balances = model('balances', balancesSchema);

export default Balances;
