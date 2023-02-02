if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const mongoose = require('mongoose');
const app = express();
const path = require('path');
//const layouts = require('ejs-mate')
const fs = require('fs');
const bodyParser = require('body-parser');
const override = require('method-override');
const flash = require('connect-flash');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const MongoDBStore = require('connect-mongodb-session')(session);
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser')
const Employers = require('./models/employees');
const User = require('./models/models')
const { isLoged } = require('./midleware/loged');

const Vacation = require('./models/vacation');

const db_URL = process.env.DB_URL

mongoose.connect(db_URL);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
    console.log("Database connection established");
})


app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.json());
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile)



//app.use(cookieParser()) ne rabis ce mas express-session
app.use(override('_method'))
app.use(mongoSanitize());


const secret = process.env.SECRET || 'mySecret';

const store = new MongoDBStore({
    uri: db_URL,
    databaseNamespace: 'providioMB',
    secret: secret,
    touchAfter: 24 * 60 * 60,
})

store.on('error', function (e) {
    console.log("Session error", e)
});

const sessionConf = {
    name: 'session',
    secret: secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expire: Date.now() + 1000 * 60 * 60 * 24 * 2,
        maxAge: 2 * 60 * 60 * 24 * 1000,
    }
}

app.use(session(sessionConf));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());

passport.use('local', new LocalStrategy(Employers.authenticate()));
passport.serializeUser(Employers.serializeUser());
passport.deserializeUser(Employers.deserializeUser());

app.use((req, res, next) => {
    //console.log("----------", req.session, "----------")
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    //console.log(res);
    next();
})

let todayDate = new Date();
let date = todayDate.toLocaleDateString()
let year = todayDate.getFullYear()

app.get('/', async (req, res) => {
    res.render('employeeLogin');
})

app.get('/employee/myData',isLoged, async (req, res) => {
    
    const employeeStatus = await Employers.find({ username: { $regex: `${req.user.username}`, $options: 'i' } });
    let status = ''
    for (status of employeeStatus) {
        status = status.status

    }

    if (status != 'active') {
        req.flash('error', 'Your account is not active anymore. Please contact admin if you think your status must be changed.')
        res.redirect('/')
    } else {
        const findedEmployee = await User.find({ buyer: { $regex: `${req.user.username}`, $options: 'i' }, pay: 'false' })
        const holidayInfo = await Vacation.find({ user: { $regex: `${req.user.username}`, $options: 'i' } })
        const holiday = await Vacation.find({})
        res.render('userCheckByHimself', { findedEmployee, holidayInfo, year, holiday })
    }

    /*
    //const user = await User.find({ buyer: { $regex: `${employee}`, $options: 'i' } }).limit(1)


    for (let username of user) {
        findedUser.pop();
        findedUser.push(username.buyer)
    }
    let newUser = findedUser[0];
    if (!employee || status != 'active') {
        req.flash('error', 'Employee not found or your account is not active anymore. Please contact admin if you think your status must be changed.')
        res.redirect('/employee')
    } else {
        const findedEmployee = await User.find({ buyer: { $regex: `${employee}`, $options: 'i' }, pay: 'false' })
        const holidayInfo = await Vacation.find({ user: { $regex: `${employee}`, $options: 'i' } })
        const holiday = await Vacation.find({})

        for (pending of holidayInfo) {
            userID.pop();
            userID.push(pending.id)
        }
        res.render('userCheckByHimself', { findedEmployee, newUser, holidayInfo, year, holiday })
    }
    */
   // res.send(req.user)

})

app.get('/employee/myData/:id', async (req, res) => {
    const { id } = req.params;
    const userHoliday = await Vacation.find({ user: { $regex: `${req.user.username}`, $options: 'i' } })
    //const holiday = userHoliday.findById(id)
    for (vac of userHoliday) {
        for (holiday of vac.pendingHolidays) {
            if (holiday.id === id) {
                res.render('userEditVacation', { holiday, vac })
            }
        }
    }


})

app.put('/employee/myData/:id', async (req, res) => {
    const { id } = req.params;
    const vac = req.body;
    const dateStart = vac.startDate.split('-').reverse().join('.');
    const dateEnd = vac.endDate.split('-').reverse().join('.');
    const updateHoliday = await Vacation.findById(id)
    await updateHoliday.pendingHolidays.pop();
    await updateHoliday.save();
    await updateHoliday.pendingHolidays.push({ startDate: `${dateStart}`, endDate: `${dateEnd}`, days: `${vac.days}`, status: `${vac.status}` });
    await updateHoliday.save();
    req.flash('success', 'Vloga za dopust je posodobljena.')
    res.redirect('/employee/myData')
})
//? EMPLOYEE DELETE VACATION
app.post('/employee/myData/delete/:id', async (req, res) => {
    const { id } = req.params;
    const deleteId = req.body.deleteVacId;
    const updateHoliday = await Vacation.findById(id)
    for (vacations of updateHoliday.pendingHolidays) {
        if (vacations.id == deleteId) {
            await updateHoliday.pendingHolidays.pop(vacations);
            await updateHoliday.save();
            req.flash('success', 'Vloga za dopust izbrisana.')
            res.redirect('/employee/myData')
        }
    }

})

app.get('/employee/askForHolidays', isLoged, async (req, res) => {
    
        const user = await Vacation.find({ user: { $regex: `${req.user.username}`, $options: 'i' } });
        for (data of user) {
            let usersData = data
            res.render('askForHolidays', {usersData })
        }
})
app.post('/askForHoliday', async (req, res) => {
    const data = req.body;
    let startDate = data.startDate;
    const dateStart = startDate.split('-').reverse().join('.');
    const dateEnd = data.endDate.split('-').reverse().join('.');
    const user = await Vacation.findById(data.userid);
    const applyDate = date;
    user.pendingHolidays.push({ startDate: `${dateStart}`, endDate: `${dateEnd}`, days: `${data.days}`, status: `${data.status}`, applyDate: `${applyDate}` });
    await user.save();
    req.flash('success', 'Vloga za dopust je odana.')
    res.redirect('/employee/myData')
})

app.post('/employee/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/employee', keepSessionInfo: true }), async (req, res) => {
    const redirect = req.session.returnTo || '/employee/myData';
    req.flash('success', 'Successfully loged', req.user.username, req.user.lastname)
    delete req.session.returnTo;
    res.redirect(redirect)
})
app.get('/logMeOut', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        } else {
            req.flash('success', 'Logged out.');
            res.redirect('/');
        }
    });
});

const port = process.env.PORT || 3000
app.listen(port,
    console.log(`listening on ${port}`))