const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Default seed categories
const DEFAULT_CATEGORIES = [
    { name: 'Registration', type: 'INCOME' },
    { name: 'Class Fee', type: 'INCOME' },
    { name: 'Tute Sale', type: 'INCOME' },
    { name: 'Other Income', type: 'INCOME' },
    { name: 'Utility', type: 'EXPENSE' },
    { name: 'Supplies', type: 'EXPENSE' },
    { name: 'Refund', type: 'EXPENSE' },
    { name: 'Teacher Payout', type: 'EXPENSE' },
    { name: 'Maintenance', type: 'EXPENSE' },
    { name: 'Marketing', type: 'EXPENSE' },
    { name: 'Other Expense', type: 'EXPENSE' }
];

const ensureDefaultCategories = async () => {
    try {
        const count = await prisma.physicalFinanceCategory.count();
        if (count === 0) {
            for (const cat of DEFAULT_CATEGORIES) {
                await prisma.physicalFinanceCategory.upsert({
                    where: { name_type: { name: cat.name, type: cat.type } },
                    update: {},
                    create: cat
                });
            }
        }
    } catch (e) {
        console.error('Error seeding default categories:', e.message);
    }
};

// Ensure seed on module load
ensureDefaultCategories();

// --- CATEGORIES CRUD ---
exports.getCategories = async (req, res) => {
    try {
        await ensureDefaultCategories();
        const { type } = req.query;
        const whereClause = type ? { type: type.toUpperCase() } : {};
        
        const categories = await prisma.physicalFinanceCategory.findMany({
            where: whereClause,
            orderBy: [{ type: 'asc' }, { name: 'asc' }]
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { name, type } = req.body;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type (INCOME/EXPENSE) are required' });
        }

        const trimmedName = name.trim();
        const upperType = type.toUpperCase();

        const category = await prisma.physicalFinanceCategory.upsert({
            where: { name_type: { name: trimmedName, type: upperType } },
            update: {},
            create: { name: trimmedName, type: upperType }
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const oldCategory = await prisma.physicalFinanceCategory.findUnique({
            where: { id: parseInt(id) }
        });

        if (!oldCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const updated = await prisma.physicalFinanceCategory.update({
            where: { id: parseInt(id) },
            data: {
                name: name.trim(),
                ...(type && { type: type.toUpperCase() })
            }
        });

        // Optionally update historical transactions category name
        if (oldCategory.name !== updated.name) {
            await prisma.physicalTransaction.updateMany({
                where: { category: oldCategory.name, type: oldCategory.type },
                data: { category: updated.name }
            });
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.physicalFinanceCategory.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- OPENING BALANCE HELPER & CALCULATION ---
const calculateOpeningBalanceForDate = async (targetDateStr) => {
    // 1. Check if an explicit manual opening balance exists for targetDateStr
    const manualForTarget = await prisma.physicalDailyOpeningBalance.findUnique({
        where: { date: targetDateStr }
    });

    if (manualForTarget) {
        return {
            openingBalance: manualForTarget.amount,
            isManual: true,
            manualRecord: manualForTarget
        };
    }

    // 2. Look for the closest manual opening balance BEFORE targetDateStr
    const previousManual = await prisma.physicalDailyOpeningBalance.findFirst({
        where: {
            date: { lt: targetDateStr }
        },
        orderBy: { date: 'desc' }
    });

    const targetDateStart = new Date(`${targetDateStr}T00:00:00.000Z`);

    if (previousManual) {
        const baseDateStart = new Date(`${previousManual.date}T00:00:00.000Z`);
        const pastTxns = await prisma.physicalTransaction.findMany({
            where: {
                isDeleted: false,
                date: {
                    gte: baseDateStart,
                    lt: targetDateStart
                }
            },
            select: { type: true, amount: true }
        });

        let pastNet = 0;
        pastTxns.forEach(t => {
            if (t.type === 'INCOME') pastNet += t.amount;
            else if (t.type === 'EXPENSE') pastNet -= t.amount;
        });

        return {
            openingBalance: previousManual.amount + pastNet,
            isManual: false,
            manualRecord: null,
            baseManualDate: previousManual.date,
            baseManualAmount: previousManual.amount
        };
    } else {
        // No prior manual record found, calculate from beginning of transactions before targetDateStart
        const pastTxns = await prisma.physicalTransaction.findMany({
            where: {
                isDeleted: false,
                date: {
                    lt: targetDateStart
                }
            },
            select: { type: true, amount: true }
        });

        let pastNet = 0;
        pastTxns.forEach(t => {
            if (t.type === 'INCOME') pastNet += t.amount;
            else if (t.type === 'EXPENSE') pastNet -= t.amount;
        });

        return {
            openingBalance: pastNet,
            isManual: false,
            manualRecord: null
        };
    }
};

// --- TRANSACTIONS CRUD ---
exports.getTransactions = async (req, res) => {
    try {
        const dateStr = req.query.date; // expecting YYYY-MM-DD
        let whereClause = {
            isDeleted: false
        };
        
        let queryDateStr = dateStr;
        if (dateStr) {
            const startDate = new Date(`${dateStr}T00:00:00.000Z`);
            const endDate = new Date(`${dateStr}T23:59:59.999Z`);
            whereClause.date = {
                gte: startDate,
                lte: endDate
            };
        } else {
            // Default to today
            const today = new Date();
            queryDateStr = today.toISOString().split('T')[0];
            const startDate = new Date(`${queryDateStr}T00:00:00.000Z`);
            const endDate = new Date(`${queryDateStr}T23:59:59.999Z`);
            whereClause.date = {
                gte: startDate,
                lte: endDate
            };
        }

        const transactions = await prisma.physicalTransaction.findMany({
            where: whereClause,
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, studentName: true, studentId: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        // Calculate summary
        let totalIncome = 0;
        let totalExpense = 0;
        transactions.forEach(t => {
            if (t.type === 'INCOME') totalIncome += t.amount;
            if (t.type === 'EXPENSE') totalExpense += t.amount;
        });
        
        const dayNet = totalIncome - totalExpense;

        // Opening balance calculation for the target date
        const openingInfo = await calculateOpeningBalanceForDate(queryDateStr);
        const openingBalance = openingInfo.openingBalance || 0;
        const closingBalance = openingBalance + dayNet;

        res.json({
            transactions,
            summary: {
                totalIncome,
                totalExpense,
                dayNet,
                openingBalance,
                isManualOpeningBalance: openingInfo.isManual,
                manualOpeningBalanceRecord: openingInfo.manualRecord,
                baseManualDate: openingInfo.baseManualDate || null,
                baseManualAmount: openingInfo.baseManualAmount || null,
                closingBalance,
                netCash: closingBalance // Cash In Hand at end of day
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addTransaction = async (req, res) => {
    try {
        const { type, category, amount, description, studentId, date } = req.body;
        
        if (!type || !category || !amount) {
            return res.status(400).json({ error: 'Type, category, and amount are required' });
        }

        let txDate = new Date();
        if (date) {
            if (typeof date === 'string' && date.length === 10) {
                // e.g. "2026-09-01" -> set to current UTC hours/minutes on that date so it sits nicely in the day
                const [year, month, day] = date.split('-').map(Number);
                const now = new Date();
                txDate = new Date(Date.UTC(year, month - 1, day, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()));
            } else {
                txDate = new Date(date);
            }
        }

        const transaction = await prisma.physicalTransaction.create({
            data: {
                type: type.toUpperCase(),
                category: category.trim(),
                amount: parseFloat(amount),
                description,
                studentId: studentId ? parseInt(studentId) : null,
                date: txDate,
                isDeleted: false
            },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, studentName: true, studentId: true }
                }
            }
        });
        
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- OPENING BALANCE CRUD & CALCULATIONS ---
exports.getOpeningBalance = async (req, res) => {
    try {
        const dateStr = req.query.date || new Date().toISOString().split('T')[0];
        const result = await calculateOpeningBalanceForDate(dateStr);
        res.json({
            date: dateStr,
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.setOpeningBalance = async (req, res) => {
    try {
        const { date, amount, note, setBy } = req.body;
        if (!date || amount === undefined || amount === null || isNaN(parseFloat(amount))) {
            return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) and numeric amount are required' });
        }

        const parsedAmount = parseFloat(amount);
        const updatedRecord = await prisma.physicalDailyOpeningBalance.upsert({
            where: { date: date.trim() },
            update: {
                amount: parsedAmount,
                note: note ? note.trim() : null,
                setBy: setBy ? setBy.trim() : 'Staff'
            },
            create: {
                date: date.trim(),
                amount: parsedAmount,
                note: note ? note.trim() : null,
                setBy: setBy ? setBy.trim() : 'Staff'
            }
        });

        res.json({
            success: true,
            message: `Opening balance for ${date} set to Rs. ${parsedAmount.toLocaleString()}`,
            record: updatedRecord
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteOpeningBalance = async (req, res) => {
    try {
        const { date } = req.params;
        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        await prisma.physicalDailyOpeningBalance.deleteMany({
            where: { date: date.trim() }
        });

        const newCalculated = await calculateOpeningBalanceForDate(date.trim());

        res.json({
            success: true,
            message: `Manual opening balance removed for ${date}. Now auto-carrying forward.`,
            calculatedOpeningBalance: newCalculated.openingBalance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, deletedBy } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'A valid deletion reason is required.' });
        }

        const existing = await prisma.physicalTransaction.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        const updated = await prisma.physicalTransaction.update({
            where: { id: parseInt(id) },
            data: {
                isDeleted: true,
                deletedReason: reason.trim(),
                deletedAt: new Date(),
                deletedBy: deletedBy ? String(deletedBy).trim() : 'Staff'
            }
        });

        res.json({ 
            success: true, 
            message: 'Transaction moved to Trash successfully.',
            transaction: updated
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- TRASH & RESTORE MANAGEMENT ---
exports.getTrashTransactions = async (req, res) => {
    try {
        const trash = await prisma.physicalTransaction.findMany({
            where: { isDeleted: true },
            include: {
                student: {
                    select: { id: true, firstName: true, lastName: true, studentName: true, studentId: true, phone: true }
                }
            },
            orderBy: { deletedAt: 'desc' }
        });

        res.json({
            success: true,
            count: trash.length,
            trash
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.restoreTransaction = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.physicalTransaction.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        const restored = await prisma.physicalTransaction.update({
            where: { id: parseInt(id) },
            data: {
                isDeleted: false,
                deletedReason: null,
                deletedAt: null,
                deletedBy: null
            }
        });

        res.json({
            success: true,
            message: 'Transaction restored successfully.',
            transaction: restored
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- FINANCIAL REPORTS & ANALYTICS ---
exports.getReports = async (req, res) => {
    try {
        const { startDate, endDate, type, category } = req.query;

        let whereClause = {
            isDeleted: false
        };

        if (startDate || endDate) {
            whereClause.date = {};
            if (startDate) {
                whereClause.date.gte = new Date(`${startDate}T00:00:00.000Z`);
            }
            if (endDate) {
                whereClause.date.lte = new Date(`${endDate}T23:59:59.999Z`);
            }
        }

        if (type && type !== 'ALL') {
            whereClause.type = type.toUpperCase();
        }

        if (category && category !== 'ALL') {
            whereClause.category = category;
        }

        const transactions = await prisma.physicalTransaction.findMany({
            where: whereClause,
            include: {
                student: {
                    select: { firstName: true, lastName: true, studentName: true, studentId: true, phone: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        let totalIncome = 0;
        let totalExpense = 0;
        let registrationFeesTotal = 0;
        let registrationCount = 0;

        const incomeCatMap = {};
        const expenseCatMap = {};
        const dailyTimelineMap = {};

        transactions.forEach(t => {
            const dayKey = t.date ? new Date(t.date).toISOString().split('T')[0] : 'Unknown';
            if (!dailyTimelineMap[dayKey]) {
                dailyTimelineMap[dayKey] = { date: dayKey, income: 0, expense: 0, net: 0, count: 0 };
            }
            dailyTimelineMap[dayKey].count++;

            const catKey = t.category || 'Other';

            if (t.type === 'INCOME') {
                totalIncome += t.amount;
                dailyTimelineMap[dayKey].income += t.amount;
                dailyTimelineMap[dayKey].net += t.amount;

                if (!incomeCatMap[catKey]) {
                    incomeCatMap[catKey] = { category: catKey, total: 0, count: 0 };
                }
                incomeCatMap[catKey].total += t.amount;
                incomeCatMap[catKey].count++;

                if (catKey.toUpperCase().includes('REGISTRATION')) {
                    registrationFeesTotal += t.amount;
                    registrationCount++;
                }
            } else if (t.type === 'EXPENSE') {
                totalExpense += t.amount;
                dailyTimelineMap[dayKey].expense += t.amount;
                dailyTimelineMap[dayKey].net -= t.amount;

                if (!expenseCatMap[catKey]) {
                    expenseCatMap[catKey] = { category: catKey, total: 0, count: 0 };
                }
                expenseCatMap[catKey].total += t.amount;
                expenseCatMap[catKey].count++;
            }
        });

        const netCash = totalIncome - totalExpense;

        const incomeCategories = Object.values(incomeCatMap)
            .map(c => ({
                ...c,
                percentage: totalIncome > 0 ? ((c.total / totalIncome) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.total - a.total);

        const expenseCategories = Object.values(expenseCatMap)
            .map(c => ({
                ...c,
                percentage: totalExpense > 0 ? ((c.total / totalExpense) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.total - a.total);

        const dailyTimeline = Object.values(dailyTimelineMap).sort((a, b) => a.date.localeCompare(b.date));

        res.json({
            summary: {
                totalIncome,
                totalExpense,
                netCash,
                registrationFeesTotal,
                registrationCount,
                transactionCount: transactions.length
            },
            incomeCategories,
            expenseCategories,
            dailyTimeline,
            transactions
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Global Settings for Registration Fee
exports.getDefaultRegFee = async (req, res) => {
    try {
        const setting = await prisma.appSetting.findUnique({
            where: { key: 'DEFAULT_REG_FEE' }
        });
        res.json({ amount: setting ? parseFloat(setting.value) : 1000 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.setDefaultRegFee = async (req, res) => {
    try {
        const { amount } = req.body;
        const setting = await prisma.appSetting.upsert({
            where: { key: 'DEFAULT_REG_FEE' },
            update: { value: amount.toString() },
            create: { key: 'DEFAULT_REG_FEE', value: amount.toString() }
        });
        res.json({ success: true, amount: parseFloat(setting.value) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
