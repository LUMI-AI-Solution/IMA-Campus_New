const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// 🔥 Role Format Fixer Helper 🔥
const checkIsTopLevel = (role) => {
    if (!role) return false;
    const normalized = role.toUpperCase().replace(' ', '_');
    return normalized === 'SYSTEM_ADMIN' || normalized === 'DIRECTOR';
};

// 1. Get All Businesses
exports.getBusinesses = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const businessType = req.user.businessType;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/ /g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(roleUpper);
        
        let businesses;
        if (isAdmin) {
            businesses = await prisma.business.findMany({ select: { id: true, name: true } });
        } else {
            const allBiz = await prisma.business.findMany({ select: { id: true, name: true, head_manager_id: true, ass_manager_id: true } });
            businesses = allBiz.filter(biz => {
                const isManagerOf = biz.head_manager_id === userId || biz.ass_manager_id === userId;
                const matchesBizType = businessType && (
                    String(biz.id) === String(businessType).trim() ||
                    biz.name.toLowerCase().trim() === String(businessType).toLowerCase().trim() ||
                    biz.name.toLowerCase().includes(String(businessType).toLowerCase().trim()) ||
                    String(businessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
                );
                return isManagerOf || matchesBizType;
            });
        }
        res.status(200).json(businesses.map(b => ({ id: b.id, name: b.name })));
    } catch (error) { res.status(500).json({ error: "Failed to fetch businesses" }); }
};

// 2. Get all staff 
exports.getStaff = async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id;
        const userRole = req.user.role;
        const managerBusinessType = req.user.businessType;
        
        const roleUpper = userRole ? userRole.toUpperCase().replace(/ /g, '_') : '';
        const isAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes(roleUpper);
        
        let whereClause = {
            role: { notIn: ['STUDENT', 'USER', 'Student', 'student', 'user'] }
        };

        const allStaff = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, firstName: true, lastName: true, phone: true, nic: true, role: true, department: true, businessType: true }
        });
        
        if (isAdmin) {
            return res.status(200).json(allStaff);
        }

        const allBiz = await prisma.business.findMany();
        const myBizs = allBiz.filter(biz => {
            const isManagerOf = biz.head_manager_id === userId || biz.ass_manager_id === userId;
            const matchesBizType = managerBusinessType && (
                String(biz.id) === String(managerBusinessType).trim() ||
                biz.name.toLowerCase().trim() === String(managerBusinessType).toLowerCase().trim() ||
                biz.name.toLowerCase().includes(String(managerBusinessType).toLowerCase().trim()) ||
                String(managerBusinessType).toLowerCase().trim().includes(biz.name.toLowerCase().trim())
            );
            return isManagerOf || matchesBizType;
        });
        
        const myBizIds = myBizs.map(b => String(b.id));
        const myBizNames = myBizs.map(b => b.name.toLowerCase().trim());
        
        const filteredStaff = allStaff.filter(s => {
            if (!s.businessType) return false;
            const sBiz = String(s.businessType).trim().toLowerCase();
            return myBizIds.includes(sBiz) || 
                   myBizNames.includes(sBiz) || 
                   myBizs.some(b => b.name.toLowerCase().includes(sBiz) || sBiz.includes(b.name.toLowerCase()));
        });
        
        res.status(200).json(filteredStaff);
    } catch (error) { res.status(500).json({ error: "Failed to fetch staff" }); }
};

// 3. Create new staff
exports.createStaff = async (req, res) => {
    try {
        const { firstName, lastName, phone, nic, password, role, department, businessType } = req.body;
        
        const existingUser = await prisma.user.findUnique({ where: { phone } });
        if (existingUser) return res.status(400).json({ error: "Phone number already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const isTopLevel = checkIsTopLevel(role);
        const isBusinessScopedRole = department === 'Class Coordination' || role === 'Coordinator';

        const finalDepartment = isTopLevel ? null : ((role === 'Coordinator' ? 'Class Coordination' : (role === 'Caller' ? 'Call Center' : department)));
        const finalBusiness = (!isTopLevel && isBusinessScopedRole) ? businessType : null;

        const newStaff = await prisma.user.create({
            data: { firstName, lastName, phone, nic, password: hashedPassword, role, department: finalDepartment, businessType: finalBusiness }
        });

        res.status(201).json({ message: "Staff created successfully", staff: newStaff });
    } catch (error) { res.status(500).json({ error: "Failed to create staff" }); }
};

// 4. Update staff
exports.updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, phone, nic, password, role, department, businessType } = req.body;
        
        const isTopLevel = checkIsTopLevel(role);
        const isBusinessScopedRole = department === 'Class Coordination' || role === 'Coordinator';

        let updateData = { 
            firstName, lastName, phone, nic, role, 
            department: isTopLevel ? null : ((role === 'Coordinator' ? 'Class Coordination' : (role === 'Caller' ? 'Call Center' : department))), 
            businessType: (!isTopLevel && isBusinessScopedRole) ? businessType : null 
        };
        
        if (password && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const updatedStaff = await prisma.user.update({
            where: { id: parseInt(id) }, data: updateData
        });

        res.status(200).json({ message: "Staff updated", staff: updatedStaff });
    } catch (error) { res.status(500).json({ error: "Failed to update staff" }); }
};

// 5. Delete staff
exports.deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.status(200).json({ message: "Staff deleted successfully" });
    } catch (error) { res.status(500).json({ error: "Failed to delete staff" }); }
};