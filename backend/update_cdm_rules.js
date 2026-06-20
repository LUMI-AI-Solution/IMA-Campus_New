const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateRules() {
    try {
        const r = await prisma.appSetting.findUnique({where:{key:'AI_SLIP_VERIFICATION_CONFIG'}});
        let configs = JSON.parse(r.value);
        let cdm = configs.find(b => b.bankName === 'BOC').slips.find(s => s.name === 'CDM');
        cdm.rules = `1. amount: Extract the deposited amount in numbers (without LKR or commas).
2. date: Look specifically for the word 'DATE' on the slip. Next to it will be a date formatted as DD/MM/YY (e.g., 09/05/26 means May 09, 2026). Extract this exactly and convert it to YYYY-MM-DD. NEVER guess the date. If not found, return null.
3. transaction_id: Look for "DEPOSITOR RELATED REFERENCE" at the bottom of the slip and extract that exact number (e.g., 0762765116). Do NOT extract the TO account number. If "DEPOSITOR RELATED REFERENCE" is not found, extract the RECORD NO instead.`;
        
        await prisma.appSetting.update({
            where:{key:'AI_SLIP_VERIFICATION_CONFIG'}, 
            data:{value: JSON.stringify(configs)}
        });
        console.log('Updated BOC CDM rules successfully with strict reference extraction.');
    } catch(e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
updateRules();
