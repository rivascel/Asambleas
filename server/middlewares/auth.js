// middlewares/auth.js
function requireAuth(req, res, next) {
    const user = req.cookies.username;
    if (!user) {
        return res.status(401).json({ message: 'No autorizado' });
    }
    next();
}

module.exports = { requireAuth };