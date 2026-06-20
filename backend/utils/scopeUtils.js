const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getScopedBusinessId = async (user) => {
    if (!user) return null;
    
    const role = (user.role || '').toUpperCase();
    const isTopLevel = role === 'SYSTEM_ADMIN' || role === 'SYSTEM ADMIN' || role === 'DIRECTOR';
    
    if (isTopLevel) return null; // Top-level users can see everything
    
    // For Managers, Ass Managers, and Coordinators
    if (user.businessType) {
        const business = await prisma.business.findFirst({
            where: { name: user.businessType }
        });
        return business ? Number(business.id) : null;
    }
    
    return null;
};

module.exports = { getScopedBusinessId };
