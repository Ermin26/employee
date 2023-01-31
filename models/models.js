const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const ProductSchema = new Schema({
    name: [{
        type: String,
    }],
    qty: [{
        type: String
    }],
    price: [{
        type: String
    }],
    firstOfWeek: [{
        type: String,
        enum: [false, true],
    }],
    total: [{
        type: String
    }],

});

const UserSchema = new Schema({
    izdal: String,
    buyer: String,
    soldDate: String,
    kt: Number,
    products: [ProductSchema],
    year: Number,
    month: Number,
    numPerYear: {
        type: Number,
        default: 0
    },
    numPerMonth: {
        type: Number,
        default: 0
    },
    payDate: String,
    pay: {
        type: String,
        enum: [true, false],
    }
});


module.exports = mongoose.model('User', UserSchema);