const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HoursSchema = new Schema({
    date: [{
        type: String
    }],
    days: [{type: Number}],
    hours: [{type: String}],
    status: [{
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Approved', 'Rejected', 'Ended', '/']
    }]
});

const PendingSchema = new Schema({
    startDate: [{
        type: String
    }],
    endDate: [{ type: String }],
    days: [{ type: Number }],
    status: [{
        type: String,
        default: '/',
        enum: ['Pending', 'Approved', 'Rejected', 'Ended', '/']
    }],
    applyDate: [{
        type: String,
    }]
})

const VacationSchema = new Schema({
    user: String,
    lastYearHolidays: Number,
    holidays: Number,
    usedHolidays: {
        type: Number,
        default: 0,
    },
    overtime: {
        type: String,
        default: 0,
    },
    pendingHolidays: [PendingSchema],
    hours: [HoursSchema]
})


module.exports = mongoose.model('Vacation', VacationSchema)