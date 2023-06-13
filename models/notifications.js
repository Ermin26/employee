const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');


const NotificationsSchema = new Schema({
    username: String,
    user_id: String,
    days: Number,
    status: {
        type: String,
        default: 'false',
        enum: ['false', 'true']
    }
});


module.exports = mongoose.model('Notifications', NotificationsSchema)