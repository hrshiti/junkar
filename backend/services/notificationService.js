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
            const query = {
                isOnline: true,
                status: 'active',
                'kyc.status': 'verified'
            };

            // Only feri_wala and small scrappers get donation orders
            if (order.isDonation) {
                query.scrapperType = { $in: ['feri_wala', 'small'] };
            }

            const onlineScrappers = await Scrapper.find(query).select('_id fcmTokens fcmTokenMobile');

            if (onlineScrappers.length === 0) {
                logger.info(`No online scrappers found for Order ${order._id}`);
                return;
            }

            const notificationPayload = {
                title: order.isDonation ? '🎁 Donation Pickup Request!' : 'New Order Request 🔔',
                body: order.isDonation ? 'Someone wants to donate scrap nearby. It is completely free!' : 'A new pickup request is available near you!',
                data: {
                    orderId: order._id.toString(),
                    type: order.isDonation ? 'donation_order' : 'new_order'
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
     * Notify specific targeted scrappers about a B2B request
     * @param {Object} order - Order object with targetedScrappers array
     * @returns {Promise<void>}
     */
    async notifyTargetedScrappers(order) {
        try {
            if (!order.targetedScrappers || order.targetedScrappers.length === 0) return;

            const scrapperIds = order.targetedScrappers.map(id => id.toString());

            const targetedScrappers = await Scrapper.find({
                _id: { $in: scrapperIds }
            }).select('_id fcmTokens fcmTokenMobile');

            if (targetedScrappers.length === 0) {
                logger.info(`No targeted scrappers found for Order ${order._id}`);
                return;
            }

            const notificationPayload = {
                title: 'New Direct Request 🎯',
                body: 'A retailer has sent you a direct B2B scrap request!',
                data: {
                    orderId: order._id.toString(),
                    type: 'targeted_order'
                }
            };

            await Promise.allSettled(
                targetedScrappers.map(scrapper =>
                    this.notifyScrapper(scrapper._id.toString(), order, notificationPayload)
                )
            );

            logger.info(`Notified ${targetedScrappers.length} targeted scrappers for Order ${order._id}`);
        } catch (error) {
            logger.error('Error notifying targeted scrappers:', error);
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
            // A. Fetch User Name if not already there (to show on notification card)
            if (order.user && typeof order.user === 'object' && !order.user.name) {
                await order.populate('user', 'name');
            }

            // A. Send Socket Event
            notifyUser(scrapperId, 'new_order_request', {
                orderId: order._id,
                userName: order.user?.name || 'Customer',
                pickupAddress: order.pickupAddress,
                orderType: order.orderType || 'scrap_pickup',
                totalAmount: order.totalAmount,
                message: notificationPayload.body,
                city: order.pickupAddress?.city || '',
                addressPreview: [order.pickupAddress?.street, order.pickupAddress?.city]
                    .filter(Boolean).join(', ')
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
                completed: order.isDonation ? 'Dhanyawad! 🎁 Your Donation is successful' : 'Your order has been completed successfully!',
                cancelled: 'Your order has been cancelled.'
            };

            const pushMessages = {
                completed: order.isDonation 
                    ? 'Aapka daan kiya gaya scrap scrapper ne pickup kar liya hai. Anek dhanyawad!'
                    : 'Your order has been completed successfully!',
            };

            const message = statusMessages[newStatus] || 'Order status updated';
            const pushBody = (newStatus === 'completed' && pushMessages[newStatus]) || message;

            await this.notifyUser(
                order.user.toString(),
                'order_status_update',
                {
                    orderId: order._id,
                    status: newStatus,
                    message
                },
                {
                    title: order.isDonation && newStatus === 'completed' ? 'Donation Success 🎁' : 'Order Update',
                    body: pushBody,
                    data: {
                        orderId: order._id.toString(),
                        type: 'order_status_update',
                        status: newStatus,
                        isDonation: order.isDonation ? 'true' : 'false'
                    }
                }
            );
        } catch (error) {
            logger.error('Failed to notify order status change:', error);
        }
    }
    /**
     * Notify scrapper about subscription expiry warning
     * @param {String} scrapperId - Scrapper ID
     * @param {Number} daysLeft - Days remaining before expiry
     * @returns {Promise<void>}
     */
    async notifySubscriptionExpiry(scrapperId, daysLeft) {
        try {
            let title, body;
            if (daysLeft <= 1) {
                title = '\uD83D\uDEA8 Subscription Kal Expire Hogi!';
                body = 'Teri subscription kal expire ho jaayegi. Abhi renew karo warna orders band ho jaayenge!';
            } else {
                title = `\u23F0 Subscription ${daysLeft} Din Mein Expire Hogi`;
                body = `Teri subscription ${daysLeft} din mein expire hogi. Samay par renew karo!`;
            }

            await sendNotificationToUser(scrapperId, {
                title,
                body,
                data: {
                    type: 'subscription_expiry_warning',
                    scrapperId: scrapperId.toString(),
                    daysLeft: daysLeft.toString()
                }
            }, 'scrapper');

            logger.info(`[Notification-10] Subscription expiry warning sent to scrapper ${scrapperId} (${daysLeft} days left)`);
        } catch (error) {
            logger.error(`Failed to send subscription expiry warning to scrapper ${scrapperId}:`, error);
        }
    }
}

export default new NotificationService();
