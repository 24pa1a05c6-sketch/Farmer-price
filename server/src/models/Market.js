import mongoose from 'mongoose';

const marketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  state: {
    type: String,
    required: true,
    default: 'Andhra Pradesh',
    index: true
  },
  district: {
    type: String,
    required: true,
    index: true
  },
  localNameTe: {
    type: String,
    default: ''
  },
  marketType: {
    type: String,
    enum: ['APMC Regulated Mandi', 'e-NAM Integrated Mandi', 'Cooperative Market Yard'],
    default: 'e-NAM Integrated Mandi'
  },
  locationMetadata: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  }
}, { timestamps: true });

marketSchema.index({ state: 1, district: 1, name: 1 }, { unique: true });

export default mongoose.model('Market', marketSchema);
