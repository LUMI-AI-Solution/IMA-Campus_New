const { PrismaClient } = require("@prisma/client"); 
const prisma = new PrismaClient(); 

async function main() { 
    // Find any message sent by or to this phone number
    const msgs = await prisma.chatMessage.findMany({ 
        where: { 
            OR: [
                { senderId: { contains: "762342492" } },
                { receiverId: { contains: "762342492" } }
            ]
        } 
    }); 
    console.log("Messages found for phone directly:", msgs.length); 
    if (msgs.length > 0) {
        console.log("Sample Message:", JSON.stringify(msgs[0], null, 2));
    }
} 
main().then(()=>process.exit(0));
