import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Farmer or user name is required'],
    trim: true,
    minlength: 2,
    maxlength: 80
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['farmer', 'cooperative', 'admin'],
    default: 'farmer',
    index: true
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'te'],
    default: 'en'
  },
  state: {
    type: String,
    default: 'Andhra Pradesh',
    trim: true
  },
  district: {
    type: String,
    default: 'Guntur',
    trim: true
  },
  favourites: {
    crops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crop' }],
    markets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Market' }],
    recentCrops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crop' }]
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
