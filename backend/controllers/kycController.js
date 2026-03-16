import Scrapper, { getComputedBadges } from '../models/Scrapper.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { deleteFile as deleteFromCloudinary, uploadFile } from '../services/uploadService.js';
import logger from '../utils/logger.js';
import { sendNotificationToUser } from '../utils/pushNotificationHelper.js';

// @desc Submit or update KYC
// @route POST /api/kyc
// @access Private (Scrapper)
export const submitKyc = async (req, res) => {
  try {
    const userId = req.user.id;
    const { aadhaarNumber, panNumber, gstNumber, udyamAadhaarNumber } = req.body;

    logger.info(`Starting KYC submission for user: ${userId}`);
    logger.info(`Files received: ${req.files ? Object.keys(req.files).join(',') : 'None'}`);

    // 1. Find User and Scrapper
    const user = await User.findById(userId);
    if (!user || user.role !== 'scrapper') {
      return sendError(res, 'Scrapper user not found', 404);
    }

    let scrapper = await Scrapper.findById(userId);
    if (!scrapper && user.phone) {
      scrapper = await Scrapper.findOne({ phone: user.phone });
    }

    // Creating profile if not exists (auto-provision)
    if (!scrapper) {
      logger.info('Creating new scrapper profile for KYC');
      scrapper = await Scrapper.create({
        _id: user._id,
        phone: user.phone,
        name: user.name || 'Scrapper',
        email: user.email,
        vehicleInfo: { type: 'bike', number: 'NA', capacity: 0 }
      });
    }

    // 2. Validate Files
    const files = req.files || {};
    const aadhaarFile = files['aadhaar'] ? files['aadhaar'][0] : null;
    const selfieFile = files['selfie'] ? files['selfie'][0] : null;
    const panFile = files['pan'] ? files['pan'][0] : null;
    const shopLicenseFile = files['shopLicense'] ? files['shopLicense'][0] : null;
    const shopPhotoFile = files['shopPhoto'] ? files['shopPhoto'][0] : null;
    const gstCertificateFile = files['gstCertificate'] ? files['gstCertificate'][0] : null;

    // Validation: Check if we have the documents either in this request OR already in DB
    const hasAadhaar = aadhaarFile || scrapper.kyc?.aadhaarPhotoUrl;
    const hasSelfie = selfieFile || scrapper.kyc?.selfieUrl;

    if (!hasAadhaar || !hasSelfie) {
      return sendError(res, 'Aadhaar and Selfie photos are required.', 400);
    }

    if (!aadhaarNumber && !scrapper.kyc?.aadhaarNumber) {
      return sendError(res, 'Aadhaar number is required.', 400);
    }

    // Dukandaar must upload shop photo
    if (scrapper.scrapperType === 'dukandaar' && !shopPhotoFile && !scrapper.kyc?.shopPhotoUrl) {
      return sendError(res, 'Shop photo is required for Dukandaar (shopkeeper).', 400);
    }

    // Wholesaler or Industrial must provide GST details
    if (['wholesaler', 'industrial'].includes(scrapper.scrapperType)) {
      if (!gstNumber && !scrapper.kyc?.gstNumber) {
        return sendError(res, 'GST number is required for Wholesaler/Industrial partners.', 400);
      }
      if (!gstCertificateFile && !scrapper.kyc?.gstCertificateUrl) {
        return sendError(res, 'GST Certificate photo is required for Wholesaler/Industrial partners.', 400);
      }
    }

    // 3. Upload to Cloudinary
    // We update fields one by one to ensure we have the URLs
    let aadhaarUrl = scrapper.kyc?.aadhaarPhotoUrl;
    let selfieUrl = scrapper.kyc?.selfieUrl;
    let panUrl = scrapper.kyc?.panPhotoUrl;
    let shopLicenseUrl = scrapper.kyc?.shopLicenseUrl;
    let shopPhotoUrl = scrapper.kyc?.shopPhotoUrl;
    let gstCertificateUrl = scrapper.kyc?.gstCertificateUrl;

    try {
      if (aadhaarFile) {
        const result = await uploadFile(aadhaarFile, { folder: 'scrapto/kyc/aadhaar' });
        aadhaarUrl = result.secure_url;
      }

      if (selfieFile) {
        const result = await uploadFile(selfieFile, { folder: 'scrapto/kyc/selfie' });
        selfieUrl = result.secure_url;
      }

      if (panFile) {
        const result = await uploadFile(panFile, { folder: 'scrapto/kyc/pan' });
        panUrl = result.secure_url;
      }

      if (shopLicenseFile) {
        const result = await uploadFile(shopLicenseFile, { folder: 'scrapto/kyc/shopLicense' });
        shopLicenseUrl = result.secure_url;
      }

      if (shopPhotoFile) {
        const result = await uploadFile(shopPhotoFile, { folder: 'scrapto/kyc/shopPhoto' });
        shopPhotoUrl = result.secure_url;
      }

      if (gstCertificateFile) {
        const result = await uploadFile(gstCertificateFile, { folder: 'scrapto/kyc/gst' });
        gstCertificateUrl = result.secure_url;
      }
    } catch (uploadError) {
      logger.error('Error uploading KYC documents:', uploadError);
      return sendError(res, `Failed to upload documents: ${uploadError.message}`, 500);
    }

    // 4. Update Database
    scrapper.kyc = {
      aadhaarNumber: aadhaarNumber || scrapper.kyc?.aadhaarNumber,
      aadhaarPhotoUrl: aadhaarUrl,
      selfieUrl: selfieUrl,
      panNumber: panNumber || scrapper.kyc?.panNumber || null,
      panPhotoUrl: panUrl,
      shopLicenseUrl: shopLicenseUrl,
      shopPhotoUrl: shopPhotoUrl,
      gstNumber: gstNumber || scrapper.kyc?.gstNumber || null,
      gstCertificateUrl: gstCertificateUrl,
      udyamAadhaarNumber: udyamAadhaarNumber || scrapper.kyc?.udyamAadhaarNumber || null,
      status: 'pending',
      submittedAt: new Date(),
      rejectionReason: null,
      resendReason: null,
      verifiedAt: null
    };

    await scrapper.save();

    logger.info('KYC Submitted Successfully', { scrapperId: scrapper._id });

    return sendSuccess(res, 'KYC submitted successfully', { kyc: scrapper.kyc }, 201);

  } catch (error) {
    logger.error('KYC submission critical error:', error);
    return sendError(res, 'Internal server error during KYC submission', 500);
  }
};

// @desc Get own KYC status
// @route GET /api/kyc/me
// @access Private (Scrapper)
export const getMyKyc = async (req, res) => {
  // req.user.id typically refers to User document (role: 'scrapper')
  const user = await User.findById(req.user.id);

  if (!user || user.role !== 'scrapper') {
    return sendError(res, 'Scrapper user not found', 404);
  }

  // Select kyc fields explicitly to include ones with select: false if needed
  let scrapper = await Scrapper.findById(user._id)
    .select('subscription kyc.status kyc.aadhaarPhotoUrl kyc.selfieUrl kyc.licenseUrl kyc.panPhotoUrl kyc.shopLicenseUrl kyc.shopPhotoUrl kyc.gstNumber kyc.gstCertificateUrl kyc.udyamAadhaarNumber kyc.submittedAt kyc.verifiedAt kyc.verifiedBy kyc.rejectionReason kyc.resendReason +kyc.aadhaarNumber +kyc.panNumber');
  if (!scrapper && user.phone) {
    scrapper = await Scrapper.findOne({ phone: user.phone })
      .select('subscription kyc.status kyc.aadhaarPhotoUrl kyc.selfieUrl kyc.licenseUrl kyc.panPhotoUrl kyc.shopLicenseUrl kyc.shopPhotoUrl kyc.gstNumber kyc.gstCertificateUrl kyc.udyamAadhaarNumber kyc.submittedAt kyc.verifiedAt kyc.verifiedBy kyc.rejectionReason kyc.resendReason +kyc.aadhaarNumber +kyc.panNumber');
  }

  // Auto-provision scrapper profile if missing
  if (!scrapper) {
    const defaultVehicleInfo = {
      type: 'bike',
      number: 'NA',
      capacity: 0
    };

    scrapper = await Scrapper.create({
      _id: user._id,
      phone: user.phone,
      name: user.name || 'Scrapper',
      email: user.email || null,
      vehicleInfo: defaultVehicleInfo
    });

    logger.info('✅ Auto-created scrapper profile during KYC fetch:', {
      userId: user._id,
      phone: user.phone
    });
  }

  // Option B: simplified status logic
  const kycRaw = scrapper.kyc || {};
  const kycObj = kycRaw.toObject ? kycRaw.toObject() : { ...kycRaw };
  
  // Ensure status is explicitly included and prioritized
  const effectiveStatus = kycObj.status || (kycObj.aadhaarPhotoUrl ? 'pending' : 'not_submitted');

  return sendSuccess(res, 'KYC status retrieved', {
    kyc: { ...kycObj, status: effectiveStatus },
    status: effectiveStatus, // Legacy client support
    subscription: scrapper.subscription
  });
};

// @desc Admin verify KYC
// @route POST /api/kyc/:id/verify
// @access Private (Admin)
export const verifyKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const scrapper = await Scrapper.findById(id);
    if (!scrapper) return sendError(res, 'Scrapper not found', 404);

    scrapper.kyc.status = 'verified';
    scrapper.kyc.verifiedAt = new Date();
    scrapper.kyc.verifiedBy = req.user.id;
    scrapper.kyc.rejectionReason = null;
    scrapper.kyc.resendReason = null;
    await scrapper.save();

    // [NOTIFICATION-1] KYC approved -> Scrapper ko push notification (non-blocking)
    sendNotificationToUser(id, {
      title: '🎉 KYC Verified!',
      body: 'Badhai ho! Tumhari KYC verify ho gayi. Ab tum orders accept kar sakte ho.',
      data: { type: 'kyc_verified', scrapperId: id }
    }, 'scrapper').catch(err => logger.error('[Notification] KYC verify notification failed:', err));

    return sendSuccess(res, 'KYC verified', { kyc: scrapper.kyc });
  } catch (error) {
    logger.error('KYC verification error:', error);
    return sendError(res, 'Failed to verify KYC', 500);
  }
};

// @desc Admin reject KYC
// @route POST /api/kyc/:id/reject
// @access Private (Admin)
export const rejectKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const scrapper = await Scrapper.findById(id);
    if (!scrapper) return sendError(res, 'Scrapper not found', 404);

    scrapper.kyc.status = 'rejected';
    scrapper.kyc.rejectionReason = reason || 'Not specified';
    scrapper.kyc.resendReason = null;
    scrapper.kyc.verifiedAt = null;
    scrapper.kyc.verifiedBy = req.user.id;
    await scrapper.save();

    // [NOTIFICATION-1] KYC rejected -> Scrapper ko push notification (non-blocking)
    const rejectionMsg = reason ? `Reason: ${reason}` : 'Reason: Not specified';
    sendNotificationToUser(id, {
      title: '❌ KYC Rejected',
      body: `Tumhari KYC reject ho gayi. ${rejectionMsg}. Dobara documents submit karo.`,
      data: { type: 'kyc_rejected', scrapperId: id, reason: reason || '' }
    }, 'scrapper').catch(err => logger.error('[Notification] KYC reject notification failed:', err));

    return sendSuccess(res, 'KYC rejected', { kyc: scrapper.kyc });
  } catch (error) {
    logger.error('KYC rejection error:', error);
    return sendError(res, 'Failed to reject KYC', 500);
  }
};

// @desc Admin get all scrappers with KYC status
// @route GET /api/kyc/scrappers
// @access Private (Admin)
export const getAllScrappersWithKyc = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {};
    if (status && ['pending', 'verified', 'rejected', 'resend_required'].includes(status)) {
      query['kyc.status'] = status;
      // Pending queue: only show scrappers who actually submitted docs (have aadhaar photo)
      if (status === 'pending') {
        query['kyc.aadhaarPhotoUrl'] = { $exists: true, $ne: null };
      }
    }

    // Get scrappers with KYC info
    const scrappers = await Scrapper.find(query)
      .select('name phone email scrapperType dealCategories businessLocation subscription status totalPickups earnings rating badges createdAt vehicleInfo kyc.aadhaarNumber kyc.aadhaarPhotoUrl kyc.selfieUrl kyc.panNumber kyc.panPhotoUrl kyc.shopLicenseUrl kyc.shopPhotoUrl kyc.gstNumber kyc.gstCertificateUrl kyc.udyamAadhaarNumber kyc.status kyc.verifiedAt kyc.rejectionReason kyc.resendReason')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Scrapper.countDocuments(query);
    const scrappersWithBadges = scrappers.map(s => ({ ...s, badges: getComputedBadges(s) }));

    return sendSuccess(res, 'Scrappers retrieved', {
      scrappers: scrappersWithBadges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get scrappers with KYC error:', error);
    return sendError(res, 'Failed to retrieve scrappers', 500);
  }
};

// @desc Admin request scrapper to re-upload KYC documents
// @route POST /api/kyc/:id/request-resend
// @access Private (Admin)
export const requestKycResend = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const scrapper = await Scrapper.findById(id);
    if (!scrapper) return sendError(res, 'Scrapper not found', 404);

    // Must have submitted KYC at least once before admin can request resend
    if (!scrapper.kyc || !scrapper.kyc.aadhaarPhotoUrl) {
      return sendError(res, 'Scrapper has not submitted KYC yet', 400);
    }

    scrapper.kyc.status = 'resend_required';
    scrapper.kyc.resendReason = reason || null;
    scrapper.kyc.rejectionReason = null;
    scrapper.kyc.verifiedAt = null;
    scrapper.kyc.verifiedBy = req.user.id;
    await scrapper.save();

    // Push notification to scrapper
    const reasonMsg = reason ? `Reason: ${reason}` : 'Please review the instructions.';
    sendNotificationToUser(id, {
      title: '📋 Document Re-upload Required',
      body: `Admin ne aapke KYC documents dubara upload karne ko kaha hai. ${reasonMsg}`,
      data: { type: 'kyc_resend_required', scrapperId: id, reason: reason || '' }
    }, 'scrapper').catch(err => logger.error('[Notification] KYC resend notification failed:', err));

    return sendSuccess(res, 'Resend request sent to scrapper', { kyc: scrapper.kyc });
  } catch (error) {
    logger.error('KYC resend request error:', error);
    return sendError(res, 'Failed to send resend request', 500);
  }
};


