const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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
    pendingHolidays: [PendingSchema]
})


module.exports = mongoose.model('Vacation', VacationSchema)