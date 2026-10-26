import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Crop from '../models/Crop.js';
import Market from '../models/Market.js';
import MarketPrice from '../models/MarketPrice.js';

dotenv.config();

const CROPS = [
  {
    name: 'Paddy (Dhan)',
    normalizedName: 'paddy',
    category: 'Cereals',
    varieties: ['BPT 5204 (Sona Masoori)', 'MTU 1010', 'Swarna (MTU 7029)'],
    localNames: { te: 'వరి (ధాన్యం)', hi: 'धान' },
    defaultUnit: 'INR/Quintal'
  },
  {
    name: 'Red Chilli (Dry)',
    normalizedName: 'chilli',
    category: 'Spices',
    varieties: ['Guntur Sannam (S4)', 'Teja (S17)', 'Byadgi (341)'],
    localNames: { te: 'ఎండు మిర్చి', hi: 'लाल मिर्च' },
    defaultUnit: 'INR/Quintal'
  },
  {
    name: 'Tomato',
    normalizedName: 'tomato',
    category: 'Vegetables',
    varieties: ['Hybrid Madanapalle', 'Desi Local'],
    localNames: { te: 'టమాటా', hi: 'टमाटर' },
    defaultUnit: 'INR/Quintal'
  },
  {
    name: 'Cotton (Kapas)',
    normalizedName: 'cotton',
    category: 'Fibre Crops',
    varieties: ['Long Staple (Bunny Bt)', 'Medium Staple'],
    localNames: { te: 'పత్తి', hi: 'कपास' },
    defaultUnit: 'INR/Quintal'
  },
  {
    name: 'Maize (Corn)',
    normalizedName: 'maize',
    category: 'Cereals',
    varieties: ['Yellow Hybrid', 'Poultry Grade'],
    localNames: { te: 'మొక్కజొన్న', hi: 'मक्का' },
    defaultUnit: 'INR/Quintal'
  },
  {
    name: 'Onion',
    normalizedName: 'onion',
    category: 'Vegetables',
    varieties: ['Kurnool Red', 'Bellary Red'],
    localNames: { te: 'ఉల్లిపాయ', hi: 'प्याज' },
    defaultUnit: 'INR/Quintal'
  }
];

const MARKETS = [
  { name: 'Guntur Mirchi Yard (APMC)', code: 'AP-GNT-01', state: 'Andhra Pradesh', district: 'Guntur', localNameTe: 'గుంటూరు మిర్చి యార్డ్', marketType: 'e-NAM Integrated Mandi' },
  { name: 'Tadepalligudem Mandi', code: 'AP-WGD-01', state: 'Andhra Pradesh', district: 'West Godavari', localNameTe: 'తాడేపల్లిగూడెం మార్కెట్', marketType: 'e-NAM Integrated Mandi' },
  { name: 'Kakinada APMC Market', code: 'AP-KKD-01', state: 'Andhra Pradesh', district: 'Kakinada', localNameTe: 'కాకినాడ మార్కెట్ యార్డ్', marketType: 'APMC Regulated Mandi' },
  { name: 'Rajahmundry Market Yard', code: 'AP-EGD-01', state: 'Andhra Pradesh', district: 'East Godavari', localNameTe: 'రాజమండ్రి మార్కెట్ యార్డ్', marketType: 'e-NAM Integrated Mandi' },
  { name: 'Vijayawada Gollapudi Mandi', code: 'AP-NTR-01', state: 'Andhra Pradesh', district: 'NTR (Vijayawada)', localNameTe: 'విజయవాడ గొల్లపూడి మండి', marketType: 'e-NAM Integrated Mandi' },
  { name: 'Kurnool Wholesale Mandi', code: 'AP-KNL-01', state: 'Andhra Pradesh', district: 'Kurnool', localNameTe: 'కర్నూలు మార్కెట్ యార్డ్', marketType: 'e-NAM Integrated Mandi' },
  { name: 'Madanapalle Tomato Market', code: 'AP-ANN-01', state: 'Andhra Pradesh', district: 'Annamayya', localNameTe: 'మదనపల్లె టమాటా మార్కెట్', marketType: 'e-NAM Integrated Mandi' },
  { name: 'Adoni Cotton Market Yard', code: 'AP-KNL-02', state: 'Andhra Pradesh', district: 'Kurnool', localNameTe: 'ఆదోని పత్తి మార్కెట్', marketType: 'e-NAM Integrated Mandi' }
];

async function seedDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kisansetu';
  await mongoose.connect(uri);
  console.log('[Seed] Connected to MongoDB. Seeding initial crops, markets, and safe initial admin...');

  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@kisansetu.org';
  const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMeImmediately!2026';
  const adminHash = await bcrypt.hash(adminPass, 12);

  await User.findOneAndUpdate(
    { email: adminEmail },
    {
      name: 'APMC Market Administrator',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'admin',
      preferredLanguage: 'en',
      state: 'Andhra Pradesh',
      district: 'Guntur'
    },
    { upsert: true, new: true }
  );

  for (const c of CROPS) {
    await Crop.findOneAndUpdate({ normalizedName: c.normalizedName }, c, { upsert: true });
  }
  for (const m of MARKETS) {
    await Market.findOneAndUpdate({ code: m.code }, m, { upsert: true });
  }

  console.log('[Seed] Completed successfully.');
  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
