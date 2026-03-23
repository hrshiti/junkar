import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Price from '../models/Price.js';
import logger from '../utils/logger.js';

// @desc    Get all active public prices
// @route   GET /api/public/prices
// @access  Public
export const getPublicPrices = asyncHandler(async (req, res) => {
    try {
        // Only fetch active prices
        // Get distinct categories first to avoid duplicates if multiple regions exist (simplification for now)
        // Or just get all active prices for default region (IN-DL) or all regions if specific query

        const filter = {};
        if (req.query.regionCode) {
            filter.regionCode = req.query.regionCode;
        } else {
            // Default to IN-DL or just show all unique categories?
            // Let's default to 'IN-DL' to be consistent with default creation
            filter.regionCode = 'IN-DL';
        }

        const prices = await Price.find(filter)
            .select('category pricePerKg price type regionCode effectiveDate updatedAt image minPrice maxPrice isNegotiable isActive')
            .sort({ category: 1 });

        sendSuccess(res, 'Public prices retrieved successfully', { prices });
    } catch (error) {
        logger.error('[Public] Error fetching prices:', error);
        sendError(res, 'Failed to fetch prices', 500);
    }
});

// @desc    Get referral tiers and settings for public view
// @route   GET /api/public/referral-config
// @access  Public
export const getPublicReferralConfig = asyncHandler(async (req, res) => {
    try {
        const [tiers, settings] = await Promise.all([
            import('../models/ReferralTier.js').then(m => m.default.find().sort({ minReferrals: 1 })),
            import('../models/ReferralSetting.js').then(m => m.default.findOne())
        ]);

        sendSuccess(res, 'Referral configuration retrieved successfully', { 
            tiers: tiers.length > 0 ? tiers : null, 
            settings: settings 
        });
    } catch (error) {
        logger.error('[Public] Error fetching referral config:', error);
        // We still send success with nulls to let frontend use defaults instead of hard crashing
        sendSuccess(res, 'Failed to fetch dynamic config, using system defaults', { tiers: null, settings: null });
    }
});
