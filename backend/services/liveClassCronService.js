const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require('firebase-admin');

// 15-minute live class reminder and Auto Delete Cron Job
// Runs every minute
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();

        const liveClasses = await prisma.content.findMany({
            where: {
                contentType: 'live',
                date: { not: null }
            }
        });

        for (const cls of liveClasses) {
            if (!cls.date) continue;

            // Extract date in Asia/Colombo timezone to prevent UTC shift issues
            const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' });
            const dateStr = formatter.format(cls.date);

            // --- 1. 15-Minute Reminder Logic ---
            if (!cls.reminderSent && cls.startTime) {
                const timeMatch = cls.startTime.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
                let hoursStr = "00", minutesStr = "00";
                if (timeMatch) {
                    let hours = parseInt(timeMatch[1], 10);
                    let minutes = parseInt(timeMatch[2], 10);
                    const ampm = timeMatch[3]?.toUpperCase();

                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;

                    hoursStr = hours.toString().padStart(2, '0');
                    minutesStr = minutes.toString().padStart(2, '0');
                }
                const formattedStartTime = `${hoursStr}:${minutesStr}`;
                const startDateTime = new Date(`${dateStr}T${formattedStartTime}:00+05:30`);
                
                const diffMins = (startDateTime - now) / (1000 * 60);
                
                console.log(`[CRON DEBUG] Class ${cls.id}: start=${startDateTime.toISOString()}, now=${now.toISOString()}, diff=${diffMins}`);

                // If class is within 15 minutes and hasn't started yet
                if (diffMins > 0 && diffMins <= 15) {
                    try {
                        const contentCourses = await prisma.contentCourse.findMany({ where: { content_id: cls.id } });
                        
                        let targetTopics = [];
                        if (contentCourses.length > 0) {
                            targetTopics = contentCourses.map(cc => `course_${cc.course_id}`);
                        } else {
                            targetTopics = [`batch_${cls.batchId}`];
                        }
                        
                        for (const targetTopic of targetTopics) {
                            const message = {
                                notification: {
                                    title: `🔴 Live Class Reminder!`,
                                    body: `${cls.title} will start in ${Math.round(diffMins)} minutes.`
                                },
                                data: {
                                    type: 'live_class',
                                    class_id: String(cls.id)
                                },
                                android: {
                                    priority: 'high'
                                },
                                apns: {
                                    payload: { aps: { 'content-available': 1, sound: 'default' } }
                                },
                                topic: targetTopic
                            };

                            try {
                                await admin.messaging().send(message);
                                console.log(`[CRON] 15-min reminder sent for Live Class ID: ${cls.id} to ${targetTopic}`);
                            } catch (e) {
                                console.error(`[CRON] Push Error for topic ${targetTopic}:`, e);
                            }
                        }
                        
                        await prisma.content.update({
                            where: { id: cls.id },
                            data: { reminderSent: true }
                        });
                    } catch (e) {
                        console.error("[CRON] Reminder Logic Error:", e);
                    }
                }
            }

            // --- 2. Auto Delete Logic ---
            if (cls.autoDeleteHours !== null && cls.endTime) {
                const endMatch = cls.endTime.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
                let eHoursStr = "00", eMinutesStr = "00";
                if (endMatch) {
                    let hours = parseInt(endMatch[1], 10);
                    let minutes = parseInt(endMatch[2], 10);
                    const ampm = endMatch[3]?.toUpperCase();

                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;

                    eHoursStr = hours.toString().padStart(2, '0');
                    eMinutesStr = minutes.toString().padStart(2, '0');
                }
                const formattedEndTime = `${eHoursStr}:${eMinutesStr}`;
                const endDateTime = new Date(`${dateStr}T${formattedEndTime}:00+05:30`);
                // Calculate when it should be deleted
                const deleteTime = new Date(endDateTime.getTime() + cls.autoDeleteHours * 60 * 60 * 1000);

                if (now >= deleteTime) {
                    console.log(`[CRON] Auto-deleting expired Live Class ID: ${cls.id} (Expired at: ${deleteTime})`);
                    try {
                        await prisma.contentCourse.deleteMany({ where: { content_id: cls.id } });
                        await prisma.content.delete({ where: { id: cls.id } });
                    } catch (delError) {
                        console.error("[CRON] Delete Error:", delError);
                    }
                }
            }
        }
    } catch (error) {
        console.error("[CRON] Live Class Cron Error:", error);
    }
});

module.exports = {};
