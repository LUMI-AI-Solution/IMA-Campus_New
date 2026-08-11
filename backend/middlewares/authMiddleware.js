const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        // Headless Bot Bypass
        if (req.headers['x-headless-bot-secret'] === 'ima-headless-bot-secret-2026') {
            req.user = { id: null, userId: null, role: 'SYSTEM_ADMIN', isHeadlessBot: true };
            return next();
        }
        return res.status(401).json({ error: "Access Denied. No token provided." });
    }

    try {
        const secretKey = process.env.JWT_SECRET || 'ima_jwt_sec_7d160fdbbfc131f568e69501f98cb67223270989b3051b802012b45efbf9f65e_2026';
        const verified = jwt.verify(token, secretKey);
        const userId = verified.userId || verified.id;

        if (!userId) {
            return res.status(401).json({ error: "Invalid token payload." });
        }

        const user = await prisma.user.findUnique({ 
            where: { id: parseInt(userId) },
            select: { id: true, session_id: true, role: true, department: true, businessType: true } 
        });

        if (!user) {
            return res.status(401).json({ error: "User account no longer exists." });
        }

        // Single session check: ONLY apply to actual Student accounts. Staff/Coordinators/Admins bypass session restrictions completely.
        const roleUpper = String(user.role || verified.role || '').trim().toUpperCase();
        const isExplicitStaff = [
            'ADMIN', 'SUPER_ADMIN', 'SYSTEM_ADMIN', 'STAFF', 'COORDINATOR', 
            'CALLER', 'MANAGER', 'MANAGEMENT', 'TEACHER', 'INSTRUCTOR', 
            'TELECALLER', 'FINANCE', 'ASS MANAGER', 'SOCIAL MEDIA MANAGER', 'SOCIAL MEDIA STAFF'
        ].includes(roleUpper) || Boolean(user.department) || Boolean(user.businessType);

        const isStudentAccount = !isExplicitStaff && roleUpper === 'STUDENT';

        if (isStudentAccount && verified.sessionId && user.session_id && user.session_id !== verified.sessionId) {
            return res.status(401).json({ error: "Logged in from another device. Please log in again." });
        }

        req.user = {
            ...verified,
            id: parseInt(userId),
            userId: parseInt(userId)
        }; 
        next();
        
    } catch (error) {
        return res.status(401).json({ error: "Invalid or Expired Token." });
    }
};

module.exports = verifyToken;