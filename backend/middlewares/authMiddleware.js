const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Select session_id and role to allow concurrent system admin sessions without random logouts
        const user = await prisma.user.findUnique({ 
            where: { id: verified.userId || verified.id }, // userId හරි id හරි දෙකෙන් එකක්
            select: { session_id: true, role: true } 
        });
        
        // Skip concurrent session check for everyone EXCEPT Students and standard Users
        const isExcludedFromConcurrentCheck = user && (
            String(user.role).toUpperCase() !== 'STUDENT' && 
            String(user.role).toUpperCase() !== 'USER'
        );

        if (user && user.session_id && user.session_id !== verified.sessionId && !isExcludedFromConcurrentCheck) {
            return res.status(401).json({ error: "Logged in from another device. Please log in again." });
        }

        req.user = verified; 
        next();
        
    } catch (error) {
        return res.status(401).json({ error: "Invalid or Expired Token." });
    }
};

module.exports = verifyToken;