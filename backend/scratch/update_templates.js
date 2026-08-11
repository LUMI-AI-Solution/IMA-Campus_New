const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_CONFIG' } });
    if (!configSetting) {
        console.log("No config found");
        return;
    }
    
    let banks = JSON.parse(configSetting.value);
    
    // 1. Add People's Bank
    let peoplesBank = banks.find(b => b.bankName === "People's Bank");
    if (!peoplesBank) {
        peoplesBank = {
            bankName: "People's Bank",
            slips: [],
            excelDateCol: "Date",
            excelDescCol: "Description",
            excelAmountCol: "Amount",
            excelDrCrCol: "Amount",
            customColumns: []
        };
        banks.push(peoplesBank);
    }
    
    if (!peoplesBank.slips.find(s => s.name === "Online Receipt")) {
        peoplesBank.slips.push({
            name: "Online Receipt",
            rules: "Extract Date, Amount, Trace No (as transaction_id), and Remarks",
            mediaUrl: ""
        });
    }

    // 2. Add BOC Flex and BOC Online Banking Third Party
    let boc = banks.find(b => b.bankName === "BOC");
    if (boc) {
        if (!boc.slips.find(s => s.name === "Flex Online Transfer")) {
            boc.slips.push({
                name: "Flex Online Transfer",
                rules: "Extract Date, Amount, Transaction ID, and Remarks",
                mediaUrl: ""
            });
        }
        if (!boc.slips.find(s => s.name === "Online Banking Third Party")) {
            boc.slips.push({
                name: "Online Banking Third Party",
                rules: "Extract Date, Amount, Online Banking reference Number, and Description",
                mediaUrl: ""
            });
        }
    }

    await prisma.appSetting.update({
        where: { key: 'AI_SLIP_VERIFICATION_CONFIG' },
        data: { value: JSON.stringify(banks) }
    });
    
    console.log("Updated AI_SLIP_VERIFICATION_CONFIG");
}

update().catch(console.error).finally(() => process.exit(0));
