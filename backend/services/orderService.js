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
            quantityType
        } = orderData;

        // Wallet validation for cleaning service
        if (orderType === 'cleaning_service') {
            await walletService.validateBalance(userId, 100, 'user');
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
            scrapItems: scrapItems || [],
            totalWeight,
            totalAmount,
            pickupAddress,
            preferredTime,
            pickupSlot,
            images: images || [],
            notes: notes || '',
            assignmentStatus: 'unassigned',
            status: ORDER_STATUS.PENDING
        };

        if (orderType) orderPayload.orderType = orderType;
        if (serviceDetails) orderPayload.serviceDetails = serviceDetails;
        if (serviceFee) orderPayload.serviceFee = serviceFee;

        // Determine quantity type
        if (quantityType) {
            orderPayload.quantityType = quantityType;
        } else if (totalWeight >= 100) {
            orderPayload.quantityType = 'large';
        } else {
            orderPayload.quantityType = 'small';
        }

        const order = await Order.create(orderPayload);
        await order.populate('user', 'name phone email');

        logger.info(`Order created: ${order._id} by user: ${userId} (Type: ${order.orderType || 'scrap'})`);

        // Notify scrappers asynchronously (non-blocking)
        notificationService.notifyOnlineScrappers(order).catch(err => {
            logger.error('Failed to notify scrappers:', err);
        });

        return order;
    }

    /**
     * Accept order (atomic operation to prevent race conditions)
     * @param {String} orderId - Order ID
     * @param {String} scrapperId - Scrapper accepting the order
     * @returns {Object} Accepted order
     */
    async acceptOrder(orderId, scrapperId) {
        // Validate scrapper wallet balance first
        await walletService.validateBalance(scrapperId, 100, 'scrapper');

        // ATOMIC CLAIM: Only update if order is still unassigned/pending
        const order = await Order.findOneAndUpdate(
            {
                _id: orderId,
                status: ORDER_STATUS.PENDING,
                $or: [
                    { assignmentStatus: 'unassigned' },
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
                const commissionRate = 0.01; // 1%
                const commissionAmount = orderAmount * commissionRate;

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

                // 3. Deduct commission from scrapper
                await walletService.debitWallet(
                    scrapperId,
                    commissionAmount,
                    {
                        type: 'commission',
                        description: `1% Commission for Order #${order._id}`,
                        orderId: order._id
                    },
                    'scrapper',
                    session
                );

                // 4. Update order status
                order.status = ORDER_STATUS.COMPLETED;
                order.completedDate = new Date();
                await order.save({ session });

                logger.info(`Order ${orderId} completed. Amount: ₹${orderAmount}, Commission: ₹${commissionAmount}`);

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
        if (scrapper.scrapperType === 'big') {
            query.$or = [
                { quantityType: 'large' },
                { forwardedBy: { $ne: null } }
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
