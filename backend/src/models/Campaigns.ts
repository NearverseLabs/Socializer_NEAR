import { model, Schema } from 'mongoose';

const campaignsSchema: Schema = new Schema({
    id: {
        type: String,
        require: true
    },
    token: {
        type: Schema.Types.ObjectId,
        ref: 'tokens'
    },
    accountId: {
        type: String, require: true
    },
    requirements: {
        type: Array, require: true
    },
    post_link: {
        type: String, require: true
    },
    content: {
        type: String, require: true
    },
    amount: {
        type: Number, require: true
    },
    winners: {
        type: Number, require: true
    },
    duration_hr: {
        type: String, require: true
    },
    duration_min: {
        type: String, require: true
    },
    status: {
        type: String, default: "live"
    }
},
    { timestamps: true }
);

campaignsSchema.pre('find', function () {
    this.populate('token', ['id', 'name', 'contract']);
});

const Campaigns = model('campaigns', campaignsSchema);

export default Campaigns;