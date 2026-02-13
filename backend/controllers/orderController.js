import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';
import Scrapper from '../models/Scrapper.js';
import { ORDER_STATUS } from '../config/constants.js';
import logger from '../utils/logger.js';
import orderService from '../services/orderService.js';
import walletService from '../services/walletService.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (User)
export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body, req.user.id);
  sendSuccess(res, 'Order created successfully', { order }, 201);
});

// @desc    Get user's orders
// @route   GET /api/orders/my-orders
// @access  Private (User)
export const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status, page = 1, limit = 10 } = req.query;

  const query = { user: userId };
  if (status) {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const orders = await Order.find(query)
    .populate('scrapper', 'name phone email vehicleInfo')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Order.countDocuments(query);

  sendSuccess(res, 'Orders retrieved successfully', {
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});


// @desc    Get available orders for scrappers
// @route   GET /api/orders/available
// @access  Private (Scrapper)
export const getAvailableOrders = asyncHandler(async (req, res) => {
  // Get orders that are:
  // 1. Unassigned
  // 2. Status is pending
  // 3. Not already assigned to this scrapper
  // 4. Matches scrapper's service types
  const scrapperId = req.user.id;

  // Fetch scrapper profile to check services
  const scrapper = await Scrapper.findById(scrapperId);
  if (!scrapper) {
    return sendError(res, 'Scrapper profile not found', 404);
  }

  const services = scrapper.services || ['scrap_pickup']; // Default to scrap only if not set

  // Build query
  const query = {
    status: ORDER_STATUS.PENDING,
    assignmentStatus: 'unassigned',
    scrapper: { $ne: scrapperId }
  };

  // Service filtering logic - only scrap orders
  const allowedOrderTypes = [];

  if (services.includes('scrap_pickup')) {
    // Regular scrap orders usually don't have orderType or is 'scrap_pickup' or 'scrap'
    allowedOrderTypes.push(null, undefined, 'scrap_pickup', 'scrap', 'scrap_sell');
  }

  // Apply filter
  query.orderType = { $in: allowedOrderTypes };

  // Filter based on Scrapper Type
  if (scrapper.scrapperType === 'big') {
    // Big scrappers see Large requests OR forwarded requests
    // Using $and to combine with previous filters
    query.$or = [
      { quantityType: 'large' },
      { forwardedBy: { $ne: null } }
    ];
  } else {
    // Small scrappers see Small requests (default) AND NOT forwarded requests
    query.quantityType = 'small';
    query.forwardedBy = null;
  }

  const orders = await Order.find(query)
    .populate('user', 'name phone')
    .sort({ createdAt: -1 })
    .limit(20);

  sendSuccess(res, 'Available orders retrieved successfully', { orders });
});

// @desc    Get scrapper's assigned orders
// @route   GET /api/orders/my-assigned
// @access  Private (Scrapper)
export const getMyAssignedOrders = asyncHandler(async (req, res) => {
  const scrapperId = req.user.id;
  const { status } = req.query;

  const query = { scrapper: scrapperId };
  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('user', 'name phone email')
    .populate('scrapper', 'name phone')
    .sort({ createdAt: -1 });

  sendSuccess(res, 'Assigned orders retrieved successfully', { orders });
});

// @desc    Get scrapper's forwarded orders (sent to big scrappers)
// @route   GET /api/orders/my-forwarded
// @access  Private (Scrapper)
export const getMyForwardedOrders = asyncHandler(async (req, res) => {
  const scrapperId = req.user.id;
  const { status } = req.query;

  const query = { forwardedBy: scrapperId };
  if (status) {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate('user', 'name phone email')
    .populate('scrapper', 'name phone') // Big scrapper who accepted it
    .populate('forwardedBy', 'name phone') // Small scrapper (self)
    .sort({ createdAt: -1 });

  sendSuccess(res, 'Forwarded orders retrieved successfully', { orders });
});

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const scrapperId = req.user.scrapperId || req.user.id;
  const userRole = req.user.role;

  const order = await Order.findById(id)
    .populate('user', 'name phone email')
    .populate('scrapper', 'name phone liveLocation');

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // Check access: User can only see their orders, Scrapper can see assigned orders
  if (userRole === 'user' && order.user._id.toString() !== userId) {
    return sendError(res, 'Not authorized to access this order', 403);
  }

  if (userRole === 'scrapper' && order.scrapper && order.scrapper._id.toString() !== scrapperId) {
    return sendError(res, 'Not authorized to access this order', 403);
  }

  sendSuccess(res, 'Order retrieved successfully', { order });
});

// @desc    Accept order (Scrapper)
// @route   POST /api/orders/:id/accept
// @access  Private (Scrapper)
export const acceptOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const scrapperId = req.user.scrapperId || req.user.id;

  try {
    const order = await orderService.acceptOrder(id, scrapperId);
    sendSuccess(res, 'Order accepted successfully', { order });
  } catch (error) {
    if (error.message === 'Order not found') {
      return sendError(res, error.message, 404);
    }
    if (error.message.includes('Insufficient wallet balance')) {
      return sendError(res, error.message, 403);
    }
    return sendError(res, error.message, 400);
  }
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const order = await Order.findById(id);

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // Authorization checks
  if (userRole === 'user' && order.user.toString() !== userId) {
    return sendError(res, 'Not authorized to update this order', 403);
  }

  if (userRole === 'scrapper' && order.scrapper && order.scrapper.toString() !== userId) {
    return sendError(res, 'Not authorized to update this order', 403);
  }

  // Validate status transition
  const validStatuses = Object.values(ORDER_STATUS);
  if (!validStatuses.includes(status)) {
    return sendError(res, 'Invalid order status', 400);
  }

  // Update status
  order.status = status;

  // Update paymentStatus if provided (e.g. for cash payments)
  const { paymentStatus } = req.body;
  if (paymentStatus) {
    const validPaymentStatuses = Object.values(PAYMENT_STATUS);
    if (!validPaymentStatuses.includes(paymentStatus)) {
      return sendError(res, 'Invalid payment status', 400);
    }
    order.paymentStatus = paymentStatus;
  }

  // Update totalAmount if provided (e.g. final negotiated price)
  const { totalAmount } = req.body;
  if (totalAmount !== undefined && totalAmount !== null) {
    order.totalAmount = Number(totalAmount);
  }

  // Set completion date if completed
  // Set completion date if completed
  if (status === ORDER_STATUS.COMPLETED) {
    order.completedDate = new Date();

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // ---------------------------------------------------------
        // ATOMIC WALLET & COMMISSION LOGIC - SCRAP SELL ONLY
        // ---------------------------------------------------------

        // Scrap Sell: Scrapper pays User
        if (order.scrapper) {
          const orderAmount = order.totalAmount || 0;
          const commissionAmount = Math.max(1, Math.round(orderAmount * 0.01));

          // 1. Deduct Order Amount (Payment to User)
          if (orderAmount > 0 && order.paymentStatus !== 'completed') {
            const updatedScrapper = await Scrapper.findByIdAndUpdate(
              order.scrapper,
              { $inc: { "wallet.balance": -orderAmount } },
              { session, new: true }
            );

            if (updatedScrapper) {
              await WalletTransaction.create([{
                trxId: `TRX-PAY-${Date.now()}-${order._id.toString().slice(-4)}`,
                user: updatedScrapper._id,
                userType: 'Scrapper',
                amount: orderAmount,
                type: 'DEBIT',
                balanceBefore: updatedScrapper.wallet.balance + orderAmount,
                balanceAfter: updatedScrapper.wallet.balance,
                category: 'PAYMENT_SENT',
                status: 'SUCCESS',
                description: `Payment to User for Order #${order._id}`,
                orderId: order._id,
                gateway: { provider: 'WALLET' }
              }], { session });

              logger.info(`[Wallet] Deducted ₹${orderAmount} from Scrapper ${updatedScrapper._id}`);
            }
          }

          // 2. Deduct 1% Commission
          const updatedScrapperComm = await Scrapper.findByIdAndUpdate(
            order.scrapper,
            { $inc: { "wallet.balance": -commissionAmount } },
            { session, new: true }
          );

          if (updatedScrapperComm) {
            await WalletTransaction.create([{
              trxId: `TRX-COMM-${Date.now()}-${order._id.toString().slice(-4)}`,
              user: updatedScrapperComm._id,
              userType: 'Scrapper',
              amount: commissionAmount,
              type: 'DEBIT',
              balanceBefore: updatedScrapperComm.wallet.balance + commissionAmount,
              balanceAfter: updatedScrapperComm.wallet.balance,
              category: 'COMMISSION',
              status: 'SUCCESS',
              description: `Platform Fee (1%) for Order #${order._id}`,
              orderId: order._id,
              gateway: { provider: 'SYSTEM' }
            }], { session });

            logger.info(`[Commission] Deducted ₹${commissionAmount} from Scrapper ${updatedScrapperComm._id}`);
          }
        }

        // Save order state within transaction
        await order.save({ session });
      });
    } catch (transactionError) {
      logger.error(`[Order Completion] Transaction failed:`, transactionError);
      throw new Error(`Transaction failed: ${transactionError.message}`);
    } finally {
      session.endSession();
    }
  } else {
    // Non-completion updates (standard save)
    await order.save();
  }

  await order.populate('user', 'name phone');
  await order.populate('scrapper', 'name phone');

  logger.info(`Order ${id} status updated to ${status} (Payment: ${order.paymentStatus}) by ${userRole} ${userId}`);

  sendSuccess(res, 'Order status updated successfully', { order });
});

// @desc    Cancel order
// @route   POST /api/orders/:id/cancel
// @access  Private
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  const order = await Order.findById(id);

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // Authorization: User can cancel their orders, Scrapper can cancel assigned orders
  if (userRole === 'user' && order.user.toString() !== userId) {
    return sendError(res, 'Not authorized to cancel this order', 403);
  }

  if (userRole === 'scrapper' && order.scrapper && order.scrapper.toString() !== userId) {
    return sendError(res, 'Not authorized to cancel this order', 403);
  }

  // Check if order can be cancelled
  if (order.status === ORDER_STATUS.COMPLETED) {
    return sendError(res, 'Cannot cancel completed order', 400);
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    return sendError(res, 'Order is already cancelled', 400);
  }

  // Cancel order
  order.status = ORDER_STATUS.CANCELLED;
  order.assignmentStatus = 'unassigned';
  order.scrapper = null;
  if (reason) {
    order.notes = `${order.notes}\nCancellation reason: ${reason}`.trim();
  }

  await order.save();

  logger.info(`Order ${id} cancelled by ${userRole} ${userId}`);

  sendSuccess(res, 'Order cancelled successfully', { order });
});

// @desc    Update order (User can update pending orders)
// @route   PUT /api/orders/:id
// @access  Private (User)
export const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { scrapItems, pickupAddress, preferredTime, pickupSlot, images, notes } = req.body;

  const order = await Order.findById(id);

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // Only user can update their own orders
  if (order.user.toString() !== userId) {
    return sendError(res, 'Not authorized to update this order', 403);
  }

  // Can only update pending orders
  if (order.status !== ORDER_STATUS.PENDING) {
    return sendError(res, 'Can only update pending orders', 400);
  }

  // Update fields
  if (scrapItems) {
    order.scrapItems = scrapItems;
    // Recalculate totals
    let totalWeight = 0;
    let totalAmount = 0;
    scrapItems.forEach(item => {
      totalWeight += item.weight || 0;
      totalAmount += item.total || 0;
    });
    order.totalWeight = totalWeight;
    order.totalAmount = totalAmount;
  }

  if (pickupAddress) order.pickupAddress = pickupAddress;
  if (preferredTime) order.preferredTime = preferredTime;
  if (pickupSlot) order.pickupSlot = pickupSlot;
  if (images) order.images = images;
  if (notes !== undefined) order.notes = notes;

  await order.save();

  await order.populate('user', 'name phone');
  await order.populate('scrapper', 'name phone');

  logger.info(`Order ${id} updated by user ${userId}`);
  sendSuccess(res, 'Order updated successfully', { order });
});

// @desc    Forward order to Big Scrapper
// @route   POST /api/orders/:id/forward
// @access  Private (Scrapper - Small)
export const forwardToBigScrapper = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const scrapperId = req.user.scrapperId || req.user.id; // Scrapper making the request

  const order = await Order.findById(id);

  if (!order) {
    return sendError(res, 'Order not found', 404);
  }

  // 1. Verify Ownership: Order must be currently assigned to THIS scrapper
  if (!order.scrapper || order.scrapper.toString() !== scrapperId) {
    return sendError(res, 'You can only forward orders assigned to you.', 403);
  }

  // 2. Verify Status: Can only forward if not already completed/cancelled
  if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.CANCELLED) {
    return sendError(res, 'Cannot forward completed or cancelled orders.', 400);
  }

  // 3. Update Order to make it visible to Big Scrappers
  // - Set quantityType to 'large' (Big scrappers see 'large')
  // - Set forwardedBy to current scrapper
  // - Unassign current scrapper -> scrapper = null
  // - Reset status to PENDING -> So it appears in "Available Orders"

  order.quantityType = 'large';
  order.forwardedBy = scrapperId;
  order.scrapper = null;
  order.assignmentStatus = 'unassigned'; // Reset assignment
  order.status = ORDER_STATUS.PENDING;   // Reset status

  // Add Note
  const scrapperName = req.user.name || 'Scrapper';
  order.notes = (order.notes || '') + `\n[System]: Forwarded by ${scrapperName} to Big Scrappers.`;

  await order.save();

  logger.info(`Order ${id} forwarded to Big Scrapper pool by ${scrapperId}`);

  sendSuccess(res, 'Order forwarded to Big Scrappers successfully', { order });
});

