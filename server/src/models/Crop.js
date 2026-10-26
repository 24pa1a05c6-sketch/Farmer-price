import mongoose from 'mongoose';

const cropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    enum: ['Cereals', 'Spices', 'Vegetables', 'Fibre Crops', 'Pulses', 'Oilseeds', 'Fruits'],
    required: true,
    index: true
  },
  varieties: [{
    type: String,
    trim: true
  }],
  localNames: {
    te: { type: String, trim: true },
    hi: { type: String, trim: true }
  },
  defaultUnit: {
    type: String,
    enum: ['INR/Quintal', 'INR/Kg'],
    default: 'INR/Quintal'
  },
  imageUrl: {
    type: String,
    default: ''
  },
  description: {
    en: { type: String, default: '' },
    te: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.model('Crop', cropSchema);
