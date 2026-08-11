const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const settings = await prisma.crmSettings.findFirst({
        where: { businessId: 4, campaignType: 'AFTER_SEMINAR' }
    });
    console.log("Token matches:", settings.metaApiKey === 'EAAO8TG5PPlcBSNvbrqKwiiHqKou02nbeM0Xo0i7F3AiaQpRAjWhw5PYhHOFeKdzzWZB7CdIucIQT7ZCh4pmqAu0QOjXZBiH3ynspBxC6UV1Vlb1irZAgQy0JXbnXE83j96nUfJGET8WCHeJxB8gRsAX8OicVLFXFBPDZA6s12xWoOqxNC00v4pWCydJ3NszxJWwZDZD');
}
run();
