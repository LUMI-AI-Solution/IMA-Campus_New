const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

async function run() {
  const replies = await prisma.autoReply.findMany({
    where: { attachment: { endsWith: '.mp3' } }
  });
  
  for (const reply of replies) {
    const inputPath = path.join(process.cwd(), reply.attachment);
    const outputFilename = `VN_CONVERTED_${Date.now()}.ogg`;
    const outputPath = path.join(process.cwd(), 'storage/documents', outputFilename);
    
    console.log(`Converting ${inputPath} to ${outputPath}...`);
    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioCodec('libopus')
                .toFormat('ogg')
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
        
        await prisma.autoReply.update({
            where: { id: reply.id },
            data: { 
                attachment: `/storage/documents/${outputFilename}`,
                attachmentType: 'Audio'
            }
        });
        console.log(`Updated ID ${reply.id}`);
    } catch (e) {
        console.error(`Failed to convert ID ${reply.id}`, e);
    }
  }
}
run();
