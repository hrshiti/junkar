import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, SCRAP_CATEGORIES } from '../config/constants.js';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scrapper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrapper',
    default: null
  },
  quantityType: {
    type: String,
    enum: ['small', 'large'],
    default: 'small'
  },
  forwardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scrapper',
    default: null
  },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null
  },
  scrapItems: [{
    category: {
      type: String,
      enum: Object.values(SCRAP_CATEGORIES),
      required: true
    },
    weight: {
      type: Number,
      required: true,
      min: 0
    },
    rate: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalWeight: {
    type: Number,
    required: true,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PENDING
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  pickupAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  preferredTime: {
    type: String,
    default: null
  },
  pickupSlot: {
    dayName: String,
    date: String,
    slot: String,
    timestamp: Number
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  completedDate: {
    type: Date,
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  assignmentStatus: {
    type: String,
    enum: ['unassigned', 'assigned', 'accepted', 'rejected'],
    default: 'unassigned'
  },
  assignmentHistory: [{
    scrapper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    status: String,
    timeoutAt: Date
  }],
  images: [{
    url: String,
    publicId: String
  }],
  notes: {
    type: String,
    default: ''
  },
  location: {
    type: {
      type: String, // Don't do `{ location: { type: String } }`
      enum: ['Point'], // 'location.type' must be 'Point'
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ scrapper: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ location: '2dsphere' }); // Geospacial Index

// Pre-save hook to sync pickupAddress coordinates to GeoJSON location
orderSchema.pre('save', function (next) {
  if (this.pickupAddress && this.pickupAddress.coordinates && this.pickupAddress.coordinates.lat && this.pickupAddress.coordinates.lng) {
    this.location = {
      type: 'Point',
      coordinates: [this.pickupAddress.coordinates.lng, this.pickupAddress.coordinates.lat]
    };
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;

