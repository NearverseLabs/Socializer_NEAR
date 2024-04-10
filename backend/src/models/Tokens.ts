import { model, Schema } from 'mongoose';

const tokenSchema: Schema = new Schema({
  id: {
    type: String, require: true
  },
  name: {
    type: String, require: true
  },
  contract: {
    type: String, require: true
  },
  method: {
    type: String, require: true
  },
  yocto_near: {
    type: String, require: true
  },
  minimum: {
    type: Number, require: true
  },
  fee: {
    type: Number
  },
},
  { timestamps: true }
);

const Tokens = model('tokens', tokenSchema);

export default Tokens;
