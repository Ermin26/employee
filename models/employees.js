const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');


const EmployersSchema = new Schema({
    username: String,
    password: String,
    lastname: String,
    employmentStatus: {
        type: String,
        enum: ['študent', 'zaposlen/a', 'upokojenec']
    },
    status: {
        type: String,
        enum: ['active', 'inactive']
    }
});

EmployersSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('Employers', EmployersSchema)