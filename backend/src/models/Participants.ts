import { model, Schema } from 'mongoose';

const participantsSchema: Schema = new Schema({
    campaign: {
        type: Schema.Types.ObjectId,
        ref: 'campaigns'
    },
    accountId: {
        type: String, require: true
    },
    like: {
        type: Boolean, default: false
    },
    follow: {
        type: Boolean, default: false
    },
    repost: {
        type: Boolean, default: false
    },
    comment: {
        type: Boolean, default: false
    },
    human: {
        type: Boolean, default: false
    },
    finished: {
        type: Boolean, default: false
    },
    win: {
        type: Boolean, default: false
    },
},
    { timestamps: true }
);

// participantsSchema.pre('find', function () {
//     this.populate('token', ['id', 'name', 'contract']);
// });

const Participants = model('participants', participantsSchema);

export default Participants;