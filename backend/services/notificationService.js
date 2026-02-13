import Scrapper from '../models/Scrapper.js';
import { notifyUser } from './socketService.js';
import { sendNotificationToUser } from '../utils/pushNotificationHelper.js';
import logger from '../utils/logger.js';

/**
 * NotificationService - Multi-channel notification dispatch
 * Handles Socket.io, FCM push notifications, and future channels (SMS, email)
 */
class NotificationService {
    /**
     * Notify online scrappers about a new order
     * @param {Object} order - Order object
     * @returns {Promise<void>}
     */
    async notifyOnlineScrappers(order) {
        try {
            const onlineScrappers = await Scrapper.find({
                isOnline: true,
                status: 'active',
                'kyc.status': 'verified'
            }).select('_id fcmTokens fcmTokenMobile');

            if (onlineScrappers.length === 0) {
                logger.info(`No online scrappers found for Order ${order._id}`);
                return;
            }

            const notificationPayload = {
                title: 'New Order Request 🔔',
                body: 'A new pickup request is available near you!',
                data: {
                    orderId: order._id.toString(),
                    type: 'new_order'
                }
            };

            // Send notifications concurrently
            await Promise.allSettled(
                onlineScrappers.map(scrapper =>
                    this.notifyScrapper(scrapper._id.toString(), order, notificationPayload)
                )
            );

            logger.info(`Notified ${onlineScrappers.length} online scrappers for Order ${order._id}`);
        } catch (error) {
            logger.error('Error notifying online scrappers:', error);
            throw error;
        }
    }

    /**
     * Notify big scrappers about a forwarded order
     * @param {Object} order - Order object
     * @returns {Promise<void>}
     */
    async notifyBigScrappers(order) {
        try {
            const bigScrappers = await Scrapper.find({
                isOnline: true,
                status: 'active',
                'kyc.status': 'verified',
                scrapperType: 'big'
            }).select('_id fcmTokens fcmTokenMobile');

            if (bigScrappers.length === 0) {
                logger.info(`No big scrappers found for forwarded Order ${order._id}`);
                return;
            }

            const notificationPayload = {
                title: 'Forwarded Order Available 📦',
                body: 'A bulk order has been forwarded to you!',
                data: {
                    orderId: order._id.toString(),
                    type: 'forwarded_order'
                }
            };

            await Promise.allSettled(
                bigScrappers.map(scrapper =>
                    this.notifyScrapper(scrapper._id.toString(), order, notificationPayload)
                )
            );

            logger.info(`Notified ${bigScrappers.length} big scrappers for forwarded Order ${order._id}`);
        } catch (error) {
            logger.error('Error notifying big scrappers:', error);
            throw error;
        }
    }

    /**
     * Notify a single scrapper via Socket.io and FCM
     * @param {String} scrapperId - Scrapper ID
     * @param {Object} order - Order object
     * @param {Object} notificationPayload - FCM notification payload
     * @returns {Promise<void>}
     */
    async notifyScrapper(scrapperId, order, notificationPayload) {
        try {
            // A. Send Socket Event
            notifyUser(scrapperId, 'new_order_request', {
                orderId: order._id,
                pickupAddress: order.pickupAddress,
                orderType: order.orderType || 'scrap_pickup',
                totalAmount: order.totalAmount,
                message: notificationPayload.body
            });

            // B. Send Push Notification
            await sendNotificationToUser(scrapperId, notificationPayload, 'scrapper');
        } catch (error) {
            logger.error(`Failed to notify scrapper ${scrapperId}:`, error);
            // Don't throw - allow other notifications to proceed
        }
    }

    /**
     * Notify a user about order updates
     * @param {String} userId - User ID
     * @param {String} event - Event type
     * @param {Object} data - Event data
     * @param {Object} pushPayload - Optional FCM payload
     * @returns {Promise<void>}
     */
    async notifyUser(userId, event, data, pushPayload = null) {
        try {
            // Socket notification
            notifyUser(userId, event, data);

            // Push notification if payload provided
            if (pushPayload) {
                await sendNotificationToUser(userId, pushPayload, 'user');
            }
        } catch (error) {
            logger.error(`Failed to notify user ${userId}:`, error);
        }
    }

    /**
     * Send batch notifications to multiple users
     * @param {Array} userIds - Array of user IDs
     * @param {String} event - Event type
     * @param {Object} data - Event data
     * @param {Object} pushPayload - Optional FCM payload
     * @returns {Promise<void>}
     */
    async notifyBatch(userIds, event, data, pushPayload = null) {
        try {
            await Promise.allSettled(
                userIds.map(userId => this.notifyUser(userId, event, data, pushPayload))
            );
            logger.info(`Batch notification sent to ${userIds.length} users`);
        } catch (error) {
            logger.error('Batch notification failed:', error);
        }
    }

    /**
     * Notify about order status change
     * @param {Object} order - Order object
     * @param {String} newStatus - New order status
     * @returns {Promise<void>}
     */
    async notifyOrderStatusChange(order, newStatus) {
        try {
            const statusMessages = {
                confirmed: 'Your order has been accepted by a scrapper!',
                in_progress: 'Scrapper is on the way to pickup.',
                completed: 'Your order has been completed successfully!',
                cancelled: 'Your order has been cancelled.'
            };

            const message = statusMessages[newStatus] || 'Order status updated';

            await this.notifyUser(
                order.user.toString(),
                'order_status_update',
                {
                    orderId: order._id,
                    status: newStatus,
                    message
                },
                {
                    title: 'Order Update',
                    body: message,
                    data: {
                        orderId: order._id.toString(),
                        type: 'order_status_update',
                        status: newStatus
                    }
                }
            );
        } catch (error) {
            logger.error('Failed to notify order status change:', error);
        }
    }
}

export default new NotificationService();
