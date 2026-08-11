const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

BigInt.prototype.toJSON = function() { return this.toString() }

async function testModule() {
    // ID 592 is a known course from our earlier check
    const id = 592;

    const linkedContents = await prisma.contentCourse.findMany({
        where: { course_id: BigInt(id) }
    });
    
    const contentIds = linkedContents.map(lc => lc.content_id);
    
    const contents = await prisma.content.findMany({
        where: { id: { in: contentIds } },
        include: { group: true },
        orderBy: { createdAt: 'desc' }
    });

    const groupIds = [...new Set(contents.map(c => c.contentGroupId).filter(Boolean))];
    const lessonGroups = await prisma.contentGroup.findMany({
            where: { id: { in: groupIds } },
            orderBy: { itemOrder: 'asc' }
    });

    const liveClasses = contents.filter(c => c.contentType === 'live' || c.contentType === '1');
    const recordings = contents.filter(c => c.contentType === 'recording' || c.contentType === '2');
    const documents = contents.filter(c => c.contentType === 'document' || c.contentType === '3');
    const sPapers = contents.filter(c => c.contentType === 'sPaper' || c.contentType === '4');
    const papers = contents.filter(c => c.contentType === 'paper' || c.contentType === '5');

    const safeData = JSON.parse(JSON.stringify({ 
        lessonGroups, 
        contents: contents,
        liveClasses: liveClasses, 
        recordings: recordings, 
        documents, sPapers, papers,
        paidStatus: 1 
    }, (k, v) => typeof v === 'bigint' ? v.toString() : v));

    console.log("Response summary:");
    console.log("Total linked:", linkedContents.length);
    console.log("Total contents fetched:", contents.length);
    console.log("Live:", safeData.liveClasses.length);
    console.log("Rec:", safeData.recordings.length);
    console.log("Doc:", safeData.documents.length);
    
    // Check one document
    if (safeData.documents.length > 0) {
        console.log("Sample Document:", safeData.documents[0]);
    }
}

testModule().catch(e => console.error(e)).finally(() => prisma.$disconnect());
