const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMissingInstallments() {
    console.log("🔍 Checking Installment Data (Read-Only Mode)...\n");

    try {
        // Approve වුණු Installment payments විතරක් ගන්නවා
        const payments = await prisma.payment.findMany({
            where: {
                payment_type: 2,
                status: 1 // 1 = Approved
            },
            include: {
                student: true,
                business: true,
                batch: true
            }
        });

        // Subjects වල නම් ටික හොයාගන්න ඔක්කොම Courses ටික ගන්නවා
        const allCourses = await prisma.course.findMany();
        const courseMap = {};
        allCourses.forEach(c => {
            courseMap[c.id] = c.name;
        });

        const results = [];

        for (const pay of payments) {
            let subjectNames = [];
            let subCount = 0;

            // ළමයා enroll වෙලා තියෙන subjects ටිකේ නම් හොයාගන්නවා
            if (pay.subjects) {
                try {
                    const subIds = JSON.parse(pay.subjects);
                    subCount = subIds.length;
                    subjectNames = subIds.map(id => courseMap[parseInt(id)] || `Unknown ID: ${id}`);
                } catch (e) {}
            }

            // ඒ Batch එකට අදාල Installment Plan එක හොයාගන්නවා
            const plan = await prisma.installment.findFirst({
                where: {
                    batchId: pay.batchId,
                    subjectCount: { lte: subCount }
                },
                orderBy: { subjectCount: 'desc' }
            });

            let nextAmount = "No Next Phase";
            let nextPhaseNo = "N/A";

            // ඊළඟ වාරිකය (Next Phase) කීයද කියලා බලනවා
            if (plan && plan.details) {
                try {
                    const phases = JSON.parse(plan.details);
                    const currentInstallment = pay.installment_no || 1;
                    const currentPhaseIndex = currentInstallment - 1;

                    // තවත් ගෙවන්න වාරික ඉතුරුද කියලා බලනවා
                    if (currentPhaseIndex + 1 < phases.length) {
                        const nextPhase = phases[currentPhaseIndex + 1];
                        nextAmount = nextPhase.price || nextPhase.amount || 0;
                        nextPhaseNo = currentPhaseIndex + 2;
                    }
                } catch (e) {}
            }

            // ඊළඟ වාරිකය දැනටමත් සිස්ටම් එකේ හැදිලා තියෙනවද කියලා බලනවා (Upcoming එක තියෙනවද කියලා)
            let isMissing = false;
            if (nextPhaseNo !== "N/A") {
                const nextPaymentExists = await prisma.payment.findFirst({
                    where: {
                        studentId: pay.studentId,
                        batchId: pay.batchId,
                        installment_no: parseInt(nextPhaseNo)
                    }
                });
                if (!nextPaymentExists) {
                    isMissing = true; // ඊළඟ එක හැදිලා නෑ!
                }
            }

            results.push({
                "Pay ID": pay.id,
                "Student Name": pay.student ? `${pay.student.firstName} ${pay.student.lastName}` : "Unknown",
                "Business": pay.business ? pay.business.name : "Unknown",
                "Subjects Enrolled": subjectNames.join(", "),
                "Current Phase": pay.installment_no || 1,
                "Next Phase": nextPhaseNo,
                "Next Amount (LKR)": nextAmount,
                "Is Upcoming Missing?": nextPhaseNo === "N/A" ? "-" : (isMissing ? "YES ❌" : "NO ✅")
            });
        }

        // Terminal එකේ ලස්සනට Table එකක් විදිහට Print කරනවා
        if (results.length > 0) {
            console.table(results);
            console.log(`\n✅ Total Approved Installment Records Checked: ${results.length}`);
            console.log(`⚠️  Check the "Is Upcoming Missing?" column. If it says "YES ❌", that means the next phase was not auto-generated.`);
        } else {
            console.log("No approved installment payments found in the database.");
        }

    } catch (error) {
        console.error("Error reading database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkMissingInstallments();