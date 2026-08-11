const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getTransactions = async (req, res) => {
    try {
        const dateStr = req.query.date; // expecting YYYY-MM-DD
        let whereClause = {};
        
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
            today.setUTCHours(0,0,0,0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            whereClause.date = {
                gte: today,
                lt: tomorrow
            };
        }

        const transactions = await prisma.physicalTransaction.findMany({
            where: whereClause,
            include: {
                student: {
                    select: { firstName: true, lastName: true, studentId: true }
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
        
        const netCash = totalIncome - totalExpense;

        res.json({
            transactions,
            summary: {
                totalIncome,
                totalExpense,
                netCash
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addTransaction = async (req, res) => {
    try {
        const { type, category, amount, description, studentId } = req.body;
        
        if (!type || !category || !amount) {
            return res.status(400).json({ error: 'Type, category, and amount are required' });
        }

        const transaction = await prisma.physicalTransaction.create({
            data: {
                type,
                category,
                amount: parseFloat(amount),
                description,
                studentId: studentId ? parseInt(studentId) : null
            },
            include: {
                student: {
                    select: { firstName: true, lastName: true, studentId: true }
                }
            }
        });
        
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.physicalTransaction.delete({
            where: { id: parseInt(id) }
        });
        res.json({ success: true, message: 'Transaction deleted' });
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
