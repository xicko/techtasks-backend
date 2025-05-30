import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  pfp: {
    type: String,
    required: false,
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

export default User;