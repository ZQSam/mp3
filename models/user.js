// Load required packages
var mongoose = require('mongoose');

// Define our user schema
var UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User name is required.'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'User email is required.'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  pendingTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: [],
  }],
  dateCreated: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
}, {
  versionKey: false, // keep responses clean
});

// Export the Mongoose model
module.exports = mongoose.model('User', UserSchema);
