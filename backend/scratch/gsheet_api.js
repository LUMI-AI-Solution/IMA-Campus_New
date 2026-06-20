const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addGSheetEndpoints() {
    // This is just to test my concepts before putting them in the controller
    console.log("Ready to implement GSheet endpoints");
}

addGSheetEndpoints();
