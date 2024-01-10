const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const HoursNotificationsSchema = new Schema({
    username: String,
    user_id: String,
    hours_id: String,
    startDate: String,
    hours: Number,
    status:{
        type: String,
        default: 'false',
    }
});


module.exports = mongoose.model('HoursNotifications', HoursNotificationsSchema)