import { messaging, getToken, onMessage } from '../firebase';
import { apiRequest } from '../modules/shared/utils/api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Register service worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registered:', registration);
            return registration;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            throw error;
        }
    } else {
        throw new Error('Service Workers are not supported');
    }
}

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Notification permission granted');
            return true;
        } else {
            console.log('Notification permission denied');
            return false;
        }
    }
    return false;
}

// Get FCM token
async function getFCMToken() {
    try {
        const registration = await registerServiceWorker();

        if (!messaging) {
            console.log('Firebase Messaging is not supported in this browser');
            return null;
        }

        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
        });

        if (token) {
            console.log('FCM Token obtained:', token);
            return token;
        } else {
            console.log('No FCM token available');
            return null;
        }
    } catch (error) {
        console.error('Error getting FCM token:', error);
        throw error;
    }
}

// Register FCM token with backend
export async function registerFCMToken(forceUpdate = false) {
    try {
        // Check if already registered
        const savedToken = localStorage.getItem('fcm_token_web');
        if (savedToken && !forceUpdate) {
            console.log('FCM token already registered');
            return savedToken;
        }

        // Request permission
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            throw new Error('Notification permission not granted');
        }

        // Get token
        const token = await getFCMToken();
        if (!token) {
            throw new Error('Failed to get FCM token');
        }

        // Save to backend
        const response = await apiRequest('/fcm-tokens/save', {
            method: 'POST',
            body: JSON.stringify({
                token: token,
                platform: 'web'
            })
        });

        if (response && response.success) {
            localStorage.setItem('fcm_token_web', token);
            console.log('FCM token registered with backend');
            return token;
        } else {
            throw new Error('Failed to register token with backend');
        }
    } catch (error) {
        console.error('Error registering FCM token:', error);
        // Don't throw for non-critical feature
    }
}

// Setup foreground notification handler
// When the browser tab is OPEN (foreground), Firebase suppresses auto-display.
// We must manually show it using Service Worker's showNotification().
export function setupForegroundNotificationHandler(handler) {
    if (!messaging) {
        console.warn('Firebase Messaging not initialized, foreground handler skipped');
        return;
    }

    onMessage(messaging, async (payload) => {
        console.log('Foreground FCM message received:', payload);

        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                let showViaSW = false;
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration && registration.active) {
                        showViaSW = true;
                        await registration.showNotification(
                            payload.notification?.title || 'New Request 🔔',
                            {
                                body: payload.notification?.body || '',
                                icon: '/favicon.png',
                                badge: '/favicon.png',
                                data: { ...payload.data, link: '/scrapper/request-list' },
                                tag: 'new-order-' + (payload.data?.orderId || Date.now()),
                                requireInteraction: true,
                            }
                        );
                    }
                }
                
                if (!showViaSW) {
                    new Notification(payload.notification?.title || 'New Request 🔔', {
                        body: payload.notification?.body || '',
                        icon: '/favicon.png',
                    });
                }
            } catch (err) {
                console.warn('Push notification display failed, falling back:', err);
                new Notification(payload.notification?.title || 'New Request 🔔', {
                    body: payload.notification?.body || '',
                    icon: '/favicon.png',
                });
            }
        }

        // Call custom in-app handler (updates badge count etc.)
        if (handler) {
            handler(payload);
        }
    });
}

// Initialize push notifications
export async function initializePushNotifications() {
    try {
        // Push notifications are generally not supported in many in-app browsers
        if (!('serviceWorker' in navigator) || !messaging) {
            console.log('Push notifications not supported in this environment');
            return;
        }

        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        
        // Token will be registered on login or if already logged in
        const token = localStorage.getItem('token');
        if (token) {
            registerFCMToken();
        }
    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
}
