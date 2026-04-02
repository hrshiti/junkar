import Order from '../models/Order.js';
import Scrapper from '../models/Scrapper.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { ORDER_STATUS } from '../config/constants.js';
import walletService from './walletService.js';
import notificationService from './notificationService.js';
import logger from '../utils/logger.js';

/**
 * OrderService - Business logic for order lifecycle management
 */
class OrderService {
    /**
     * Create a new order
     * @param {Object} orderData - Order details from request
     * @param {String} userId - User creating the order
     * @returns {Object} Created order
     */
    async createOrder(orderData, userId) {
        const {
            scrapItems,
            pickupAddress,
            preferredTime,
            pickupSlot,
            images,
            notes,
            orderType,
            serviceDetails,
            serviceFee,
            quantityType,
            targetScrapperIds,
            isNegotiated,
            isDonation
        } = orderData;

        // Wallet validation for cleaning service
        if (orderType === 'cleaning_service') {
            await walletService.validateBalance(userId, 100, 'user');
        }

        // Role Hierarchy Validation for Targeted Scrappers
        if (targetScrapperIds && targetScrapperIds.length > 0) {
            const senderScrapper = await Scrapper.findById(userId);
            if (senderScrapper) {
                const targetScrappers = await Scrapper.find({ _id: { $in: targetScrapperIds } });
                for (const target of targetScrappers) {
                    if (senderScrapper.scrapperType === 'feri_wala' && target.scrapperType !== 'dukandaar') {
                        throw new Error('Aap sirf Dukandar ko request bhej sakte hain.');
                    }
                    if (senderScrapper.scrapperType === 'dukandaar' && target.scrapperType !== 'wholesaler') {
                        throw new Error('Dukandar sirf Wholesaler ko request bhej sakte hain.');
                    }
                    if (senderScrapper.scrapperType === 'wholesaler' && target.scrapperType !== 'wholesaler') {
                        throw new Error('Wholesaler sirf Wholesaler ko request bhej sakte hain.');
                    }
                }
            }
        }

        // Calculate totals
        let totalWeight = 0;
        let totalAmount = 0;

        if (orderType === 'cleaning_service') {
            totalAmount = serviceFee || 0;
        } else {
            if (scrapItems && Array.isArray(scrapItems)) {
                scrapItems.forEach(item => {
                    totalWeight += item.weight || 0;
                    totalAmount += item.total || 0;
                });
            }
        }

        // Build order payload
        const orderPayload = {
            user: userId,
            userModel: 'User', // Default
            scrapItems: scrapItems || [],
            totalWeight,
            totalAmount,
            pickupAddress,
            preferredTime,
            pickupSlot,
            images: images || [],
            notes: notes || '',
            assignmentStatus: targetScrapperIds && targetScrapperIds.length > 0 ? 'targeted' : 'unassigned',
            status: ORDER_STATUS.PENDING
        };

        // Determine if sender is scrapper
        const senderScrapper = await Scrapper.findById(userId);
        if (senderScrapper) {
            orderPayload.userModel = 'Scrapper';
        } else {
            // Confirm it's a regular user for absolute safety (optional but good)
            const senderUser = await User.findById(userId);
            if (senderUser) orderPayload.userModel = 'User';
        }

        if (targetScrapperIds && targetScrapperIds.length > 0) {
            orderPayload.targetedScrappers = targetScrapperIds;
        }

        if (orderType) orderPayload.orderType = orderType;
        if (serviceDetails) orderPayload.serviceDetails = serviceDetails;
        if (serviceFee) orderPayload.serviceFee = serviceFee;
        if (isNegotiated) orderPayload.isNegotiated = true;

        // Handle Donation logic
        if (isDonation === true) {
            orderPayload.isDonation = true;
            orderPayload.totalAmount = 0; // Donations are free
            // Force donation quantity type to 'small' so big scrappers don't get it by size
            orderPayload.quantityType = 'small';
        } else {
            // Determine quantity type normally
            if (quantityType) {
                orderPayload.quantityType = quantityType;
            } else if (totalWeight >= 100) {
                orderPayload.quantityType = 'large';
            } else {
                orderPayload.quantityType = 'small';
            }
        }

        const order = await Order.create(orderPayload);
        await order.populate('user', 'name phone email');

        logger.info(`Order created: ${order._id} by user: ${userId} (Type: ${order.orderType || 'scrap'}, Donation: ${!!orderPayload.isDonation})`);

        // Notify scrappers asynchronously (non-blocking)
        if (order.targetedScrappers && order.targetedScrappers.length > 0) {
            notificationService.notifyTargetedScrappers(order).catch(err => {
                logger.error('Failed to notify targeted scrappers:', err);
            });
        } else {
            notificationService.notifyOnlineScrappers(order).catch(err => {
                logger.error('Failed to notify scrappers:', err);
            });
        }

        return order;
    }

    /**
     * Accept order (atomic operation to prevent race conditions)
     * @param {String} orderId - Order ID
     * @param {String} scrapperId - Scrapper accepting the order
     * @returns {Object} Accepted order
     */
    async acceptOrder(orderId, scrapperId) {
        // Find scrapper to check online status
        const scrapper = await Scrapper.findById(scrapperId);
        if (!scrapper) {
            throw new Error('Scrapper profile not found');
        }

        // Only online scrappers can accept orders
        if (!scrapper.isOnline) {
            throw new Error('Please go online to accept this request');
        }

        // Validate scrapper wallet balance
        // If the scrapper has an active subscription (e.g., 1-month free trial), bypass the Rs 100 requirement
        if (scrapper.subscription && scrapper.subscription.status === 'active') {
            await walletService.validateBalance(scrapperId, 0, 'scrapper'); // Just ensure it's not negative
        } else {
            // Subscription expired or not active, require Rs 100 minimum balance
            await walletService.validateBalance(scrapperId, 100, 'scrapper');
        }

        // ATOMIC CLAIM: Only update if order is still unassigned/pending
        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                status: ORDER_STATUS.PENDING,
                $or: [
                    { assignmentStatus: 'unassigned' },
                    { assignmentStatus: 'targeted' },
                    { assignmentStatus: { $exists: false } },
                    { assignmentStatus: null }
                ]
            },
            {
                $set: {
                    scrapper: scrapperId,
                    assignmentStatus: 'accepted',
                    status: ORDER_STATUS.CONFIRMED,
                    assignedAt: new Date(),
                    acceptedAt: new Date()
                },
                $push: {
                    assignmentHistory: {
                        scrapper: scrapperId,
                        assignedAt: new Date(),
                        status: 'accepted'
                    }
                }
            },
            { new: true }
        );

        if (!order) {
            // Check if order exists for better error message
            const existingOrder = await Order.findById(orderId);
            if (!existingOrder) {
                throw new Error('Order not found');
            }

            // Check idempotency
            if (existingOrder.scrapper && existingOrder.scrapper.toString() === scrapperId) {
                await existingOrder.populate('user', 'name phone');
                await existingOrder.populate('scrapper', 'name phone');
                return existingOrder;
            }

            throw new Error('Order is no longer available for acceptance');
        }

        await order.populate('user', 'name phone');
        await order.populate('scrapper', 'name phone');

        logger.info(`Order ${orderId} accepted by scrapper ${scrapperId}`);

        // Notify user about acceptance
        notificationService.notifyOrderStatusChange(order, ORDER_STATUS.CONFIRMED).catch(err => {
            logger.error('Failed to notify user about order acceptance:', err);
        });

        return order;
    }

    /**
     * Complete order with wallet transactions
     * @param {String} orderId - Order ID
     * @returns {Object} Completed order
     */
    async completeOrder(orderId) {
        const session = await mongoose.startSession();

        try {
            return await session.withTransaction(async () => {
                const order = await Order.findById(orderId).session(session);

                if (!order) {
                    throw new Error('Order not found');
                }

                if (order.status === ORDER_STATUS.COMPLETED) {
                    throw new Error('Order already completed');
                }

                const scrapperId = order.scrapper;
                const userId = order.user;
                const orderAmount = order.totalAmount;

                // 1. Deduct order amount from scrapper wallet
                await walletService.debitWallet(
                    scrapperId,
                    orderAmount,
                    {
                        type: 'order_payment',
                        description: `Payment for Order #${order._id}`,
                        orderId: order._id
                    },
                    'scrapper',
                    session
                );

                // 2. Credit user wallet
                await walletService.creditWallet(
                    userId,
                    orderAmount,
                    {
                        type: 'order_earning',
                        description: `Earning from Order #${order._id}`,
                        orderId: order._id
                    },
                    'user',
                    session
                );

                // 4. Update order status
                order.status = ORDER_STATUS.COMPLETED;
                order.completedDate = new Date();
                await order.save({ session });

                logger.info(`Order ${orderId} completed. Amount: ₹${orderAmount}`);

                return order;
            });
        } finally {
            session.endSession();
        }
    }

    /**
     * Forward order to big scrapper
     * @param {String} orderId - Order ID
     * @param {String} scrapperId - Small scrapper forwarding the order
     * @returns {Object} Updated order
     */
    async forwardOrder(orderId, scrapperId) {
        const order = await Order.findById(orderId);

        if (!order) {
            throw new Error('Order not found');
        }

        if (!order.scrapper || order.scrapper.toString() !== scrapperId) {
            throw new Error('You can only forward orders assigned to you');
        }

        // Update order to make it available for big scrappers
        order.quantityType = 'large';
        order.forwardedBy = scrapperId;
        order.scrapper = null;
        order.status = ORDER_STATUS.PENDING;
        order.assignmentStatus = 'unassigned';

        await order.save();

        logger.info(`Order ${orderId} forwarded by scrapper ${scrapperId}`);

        // Notify big scrappers
        notificationService.notifyBigScrappers(order).catch(err => {
            logger.error('Failed to notify big scrappers:', err);
        });

        return order;
    }

    /**
     * Get available orders for a scrapper
     * @param {String} scrapperId - Scrapper ID
     * @param {Object} filters - Additional filters
     * @returns {Array} Available orders
     */
    async getAvailableOrders(scrapperId, filters = {}) {
        const scrapper = await Scrapper.findById(scrapperId);

        if (!scrapper) {
            throw new Error('Scrapper not found');
        }

        const query = {
            status: ORDER_STATUS.PENDING,
            assignmentStatus: { $in: ['unassigned', null] },
            scrapper: null
        };

        // Filter by scrapper type
        const bigRoles = ['big', 'wholesaler', 'dukandaar', 'industrial'];
        if (bigRoles.includes(scrapper.scrapperType)) {
            query.$or = [
                { quantityType: 'large' },
                { forwardedBy: { $ne: null } },
                { targetedScrappers: scrapperId }
            ];
        } else {
            query.quantityType = 'small';
            query.forwardedBy = null;
        }

        const orders = await Order.find(query)
            .populate('user', 'name phone')
            .sort({ createdAt: -1 })
            .limit(20);

        return orders;
    }
}

export default new OrderService();
