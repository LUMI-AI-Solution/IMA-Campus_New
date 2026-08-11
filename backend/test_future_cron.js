const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const now = new Date();
    const colomboTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Colombo"}));
    colomboTime.setMinutes(colomboTime.getMinutes() + 2); // set for 2 minutes from now
    
    const currentHour = colomboTime.getHours();
    const currentMinute = colomboTime.getMinutes();
    const futureTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const configSetting = await prisma.appSetting.findUnique({ where: { key: 'AI_SLIP_VERIFICATION_SCHEDULE' } });
    const data = JSON.parse(configSetting.value);
    data.times = [futureTimeStr];
    
    await prisma.appSetting.update({
        where: { key: 'AI_SLIP_VERIFICATION_SCHEDULE' },
        data: { value: JSON.stringify(data) }
    });
    
    console.log("Updated schedule to: ", futureTimeStr);
}
main();
