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
const Notifications = require('./models/notifications')
const { isLoged } = require('./midleware/loged');
const nodemailer = require('nodemailer');

const Vacation = require('./models/vacation');

const db_URL = process.env.DB_URL
const yoo = process.env.YOO
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


app.post('/employee/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/', keepSessionInfo: true }), async (req, res) => {
    const redirect = req.session.returnTo || '/employee/myData';
    req.flash('success', 'Successfully loged', req.user.username, req.user.lastname)
    delete req.session.returnTo;
    res.redirect(redirect)
})

app.get('/employee/myData', isLoged, async (req, res) => {
    const data = await Notifications.find({});
    const employeeStatus = await Employers.find({ username: { $regex: `${req.user.username}`, $options: 'i' } });
    let status = ''
    for (status of employeeStatus) {
        status = status.status

    }

    if (status != 'active') {
        req.flash('error', 'Vaš profil nije aktiven! ')
        res.redirect('/')
    } else {
        const findedEmployee = await User.find({ buyer: { $regex: `${req.user.username}`, $options: 'i' }, pay: 'false' })
        const holidayInfo = await Vacation.find({ user: { $regex: `${req.user.username}`, $options: 'i' } })
       
        res.render('userCheckByHimself', { findedEmployee, holidayInfo, year })
    }
})

app.get('/employee/askForHolidays', isLoged, async (req, res) => {

    const user = await Vacation.find({ user: { $regex: `${req.user.username}`, $options: 'i' } });
    for (data of user) {
        let usersData = data
        res.render('askForHolidays', { usersData })
    }
})

app.post('/askForHoliday', async (req, res) => {
    const data = req.body;
    const dateStart = data.startDate.split('-').reverse().join('.');
    const dateEnd = data.endDate.split('-').reverse().join('.');
    const user = await Vacation.findById(data.userid);
    try {
        const applyDate = date;
        user.pendingHolidays.push({ startDate: `${dateStart}`, endDate: `${dateEnd}`, days: `${data.days}`, status: `${data.status}`, applyDate: `${applyDate}` });
        await user.save(async function (err, result) { 
            if (err) {
                req.flash('error', `Error: ${e.message}. Oddaja vloge za dopust ni uspela!`);
                res.redirect('/employee/askForHolidays');
            } else {
                let transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: "jolda.ermin@gmail.com",
                        pass: `${yoo}`,
                    },
                    tls: {
                        rejectUnauthorized: false,
                    }
                });
                
                let mailOptions = {
                    from: "jolda.ermin@gmail.com",
                    to: "mb.providio@gmail.com",
                    subject: "DOPUST",
                    text: `Delavec ${user.user} je odal vlogo za dopust od ${dateStart} - ${dateEnd} dne - ${applyDate}.`,
                };
                
                transporter.sendMail(mailOptions, function (err, success) {
                    if (err) {
                        console.log(err.message);
                    } else {
                        console.log("Email sended");
                    }
                })
                let holiday = result.pendingHolidays[result.pendingHolidays.length - 1];
                const newNotification = await new Notifications({ username: `${user.user}`, days: `${data.days}`, user_id: `${user.id}`, vac_id: `${holiday._id}` })
                await newNotification.save()
            }
        });
    
    req.flash('success', 'Vloga za dopust je odana.')
    res.redirect('/employee/myData')
    } catch (e) { 
        req.flash('error', `Error: ${e.message}. Oddaja vloge za dopust ni uspela!`);
        res.redirect('/employee/askForHolidays');
    }
    
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
    //console.log(vac);
    const dateStart = vac.startDate.split('-').reverse().join('.');
    const dateEnd = vac.endDate.split('-').reverse().join('.');
    const updateHoliday = await Vacation.findById(id)
    const applyDate = date.split('-').reverse().join('.');
    try {
        
        for (let i = 0; i < updateHoliday.pendingHolidays.length; i++) {
            
            if (vac.vacId === updateHoliday.pendingHolidays[i].id) {
                
                await updateHoliday.pendingHolidays[i].startDate.pop();
                await updateHoliday.pendingHolidays[i].endDate.pop();
                await updateHoliday.pendingHolidays[i].days.pop();
                await updateHoliday.pendingHolidays[i].startDate.push(dateStart);
                await updateHoliday.pendingHolidays[i].endDate.push(dateEnd);
                await updateHoliday.pendingHolidays[i].days.push(vac.days);
                //await updateHoliday.save();
                //await updateHoliday.pendingHolidays.push({ startDate: `${dateStart}`, endDate: `${dateEnd}`, days: `${vac.days}`, status: `${vac.status}`, applyDate: `${applyDate}` });
                await updateHoliday.save(async function (err, result) { 
                if (err) {
                    req.flash('error', `Error: ${err.message}`)
                    res.redirect('/employee/myData')
                }
                else {
                    const editedVac = await Notifications.updateOne({ user_id: `${id}`, vac_id: `${vac.vacId}` }, { $set: { days: `${vac.days}` } })
                    let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "jolda.ermin@gmail.com",
                pass: `${yoo}`,
            },
            tls: {
                rejectUnauthorized: false,
            }
                });
        
                let mailOptions = {
            from: "jolda.ermin@gmail.com",
            to: "mb.providio@gmail.com",
            subject: "EDIT DOPUST",
            text: `Delavec ${updateHoliday.user} je spremenil vlogo za dopust od ${dateStart} - ${dateEnd} dne - ${applyDate}.`,
                };
        
                transporter.sendMail(mailOptions, function (err, success) {
            if (err) {
                console.log(err.message);
            } else {
                console.log("Email sended");
            }
                })
                req.flash('success', 'Vloga za dopust je posodobljena.')
                res.redirect('/employee/myData')
                }
            });
            }
        }
    } catch (err) { 
        req.flash('error', `Error: ${err.message}`)
        res.redirect('/employee/myData')
    }
})

//? EMPLOYEE DELETE VACATION
app.post('/employee/myData/delete/:id', async (req, res) => {
    const { id } = req.params;
    const deleteId = req.body.deleteVacId;
    const updateHoliday = await Vacation.findById(id)
    try {
        const deleteNot = await Notifications.deleteOne({ vac_id: deleteId })
    for (vacations of updateHoliday.pendingHolidays) {
        if (vacations.id == deleteId) {
            await updateHoliday.pendingHolidays.pop(vacations);
            await updateHoliday.save();
            req.flash('success', 'Vloga za dopust izbrisana.')
            res.redirect('/employee/myData')
        }
    }
    } catch (err) { 
        req.flash('error', `Error: ${err.message}. Vloga za dopust NI izbrisana!`)
        res.redirect('/employee/myData')
    }
    

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