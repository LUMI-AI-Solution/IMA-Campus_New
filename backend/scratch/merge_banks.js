const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_CONFIG' } });
    if(configSetting) {
        let banks = JSON.parse(configSetting.value);
        let allSlips = [];
        banks.forEach(b => {
            if (b.slips) {
                allSlips = allSlips.concat(b.slips.map(s => ({
                    ...s,
                    name: `${b.bankName} - ${s.name}` // Prefix with bank name for clarity since they save by name
                })));
            }
        });
        
        const newBanksConfig = [{
            bankName: "All Templates",
            slips: allSlips,
            excelDateCol: "",
            excelAmountCol: "",
            excelDrCrCol: "",
            customColumns: []
        }];
        
        await prisma.appSetting.update({
            where: { key: 'AI_SLIP_VERIFICATION_CONFIG' },
            data: { value: JSON.stringify(newBanksConfig) }
        });
        
        console.log("Merged all slips into one configuration:");
        console.log(JSON.stringify(newBanksConfig, null, 2));
    }
    await prisma.$disconnect();
}
main();
