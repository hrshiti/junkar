import mongoose from 'mongoose';
import User from '../models/User.js';
import Scrapper from '../models/Scrapper.js';
import { activateFirstMonthTrial } from '../services/subscriptionService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const seedDefaultScrapper = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const userData = {
            name: 'Default Scrapper',
            email: 'scrapper7000000000@junkar.in',
            phone: '7000000000',
            password: 'Scrapper@123',
            role: 'scrapper',
            isActive: true,
            isVerified: true,
            isPhoneVerified: true
        };

        // Check if user already exists
        let user = await User.findOne({ phone: userData.phone });

        if (user) {
            console.log('⚠️  User already exists! Updating...');
            user.name = userData.name;
            user.email = userData.email;
            user.password = userData.password;
            user.role = userData.role;
            user.isActive = true;
            user.isVerified = true;
            user.isPhoneVerified = true;
            await user.save();
        } else {
            console.log('🆕 Creating new default scrapper user...');
            user = await User.create(userData);
        }

        // Check if scrapper profile exists
        let scrapper = await Scrapper.findById(user._id);
        if (!scrapper) {
            console.log('🆕 Creating scrapper profile...');
            const defaultVehicleInfo = {
                type: 'bike',
                number: 'MP-00-SC-0000',
                capacity: 100
            };

            scrapper = await Scrapper.create({
                _id: user._id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                vehicleInfo: defaultVehicleInfo,
                status: 'active'
            });

            // Activate trial
            try {
                await activateFirstMonthTrial(user._id);
                console.log('✨ First month trial activated.');
            } catch (trialError) {
                console.warn('⚠️  Trial activation failed:', trialError.message);
            }
        } else {
            console.log('✅ Scrapper profile already exists.');
            scrapper.status = 'active';
            await scrapper.save();
        }

        console.log('✅ Default scrapper processed successfully!');
        console.log('   Phone:', user.phone);
        console.log('   Role:', user.role);
        console.log('   Status: Verified & Active');
        console.log('\n📱 OTP: 123456 (Bypass enabled in code)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding default scrapper:', error);
        process.exit(1);
    }
};

seedDefaultScrapper();
