module.exports.isLoged = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', "Please login first");
        res.redirect('/employee');
    } else {

        next();
    }
}