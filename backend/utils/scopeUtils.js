const { PrismaClient } = require('@prisma/client');
const prisma = require('../src/core/db');

const isCallCenterUser = (u) => {
    if (!u) return false;
    const r = String(u.role || '').toLowerCase();
    const d = String(u.department || '').toLowerCase();
    return r.includes('call') || d.includes('call');
};

const isStaffInBusiness = (u, targetBizId, targetBizName) => {
    if (!u) return false;
    if (isCallCenterUser(u)) return false;

    // If no target business specified (e.g. ALL), any non-call-center coordinator is allowed
    if (!targetBizName && (!targetBizId || targetBizId === 'ALL')) return true;

    const userBiz = String(u.businessType || '').toLowerCase().trim();
    if (!userBiz) return false;

    // Allow top-level campus-wide managers
    if (userBiz === 'all' || userBiz === 'ima campus' || userBiz === 'campus') return true;

    const targetName = String(targetBizName || '').toLowerCase().trim();
    const targetIdStr = targetBizId && targetBizId !== 'ALL' ? String(targetBizId).trim() : '';

    const staffBizList = userBiz.split(',').map(b => b.trim().toLowerCase()).filter(Boolean);

    return staffBizList.some(b => {
        if (targetIdStr && b === targetIdStr) return true;
        if (targetName) {
            if (b === targetName) return true;
            const cleanB = b.replace(/[\s\-_/\\|]+/g, '');
            const cleanTarget = targetName.replace(/[\s\-_/\\|]+/g, '');
            if (cleanB === cleanTarget) return true;
        }
        return false;
    });
};

const getScopedBusinessId = async (user, requestedBusinessId = null) => {
    if (!user) return null;
    
    const role = (user.role || '').toUpperCase().replace(/ /g, '_');
    const isTopLevel = role === 'SYSTEM_ADMIN' || role === 'DIRECTOR';
    
    if (isTopLevel) {
        if (requestedBusinessId && requestedBusinessId !== 'all' && requestedBusinessId !== 'null') {
            return Number(requestedBusinessId);
        }
        return null; // Top-level users can see everything
    }
    
    const userId = user.userId || user.id;
    const allBiz = await prisma.business.findMany();
    
    const userBizList = user.businessType ? String(user.businessType).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
    
    const allowedBusinesses = allBiz.filter(biz => {
        const isManagerOf = (biz.head_manager_id && String(biz.head_manager_id) === String(userId)) || 
                            (biz.ass_manager_id && String(biz.ass_manager_id) === String(userId));
        const matchesBizType = userBizList.some(b => 
            b === String(biz.id) ||
            b === biz.name.toLowerCase().trim() ||
            biz.name.toLowerCase().trim().includes(b) ||
            b.includes(biz.name.toLowerCase().trim())
        );
        return isManagerOf || matchesBizType;
    });

    if (allowedBusinesses.length === 0) return null;

    if (requestedBusinessId && requestedBusinessId !== 'all' && requestedBusinessId !== 'null') {
        const requested = allowedBusinesses.find(b => String(b.id) === String(requestedBusinessId));
        if (requested) return Number(requested.id);
    }

    if (requestedBusinessId === 'all') {
        return null;
    }

    return Number(allowedBusinesses[0].id);
};

module.exports = { getScopedBusinessId, isStaffInBusiness, isCallCenterUser };
