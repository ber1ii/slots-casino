const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    avatar: {
      type: String,
      default: 'DANTE',
    },

    // Game economy
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeSpins: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Game statistics
    totalSpins: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWins: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWagered: {
      type: Number,
      default: 0,
      min: 0,
    },
    highestWin: {
      type: Number,
      default: 0,
      min: 0,
    },
    biggestMultiplier: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastWin: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastSpinAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Stop accidental password leaking in logs/responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
