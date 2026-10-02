const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

// Helper to check if staff/admin/lecture/guider/marker
const isStaffOrTeacher = (user) => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase().replace(/[\s_-]+/g, '_');
    return [
        'SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'ASS_MANAGER', 
        'LECTURE', 'LECTURER', 'PAPER_GUIDER', 'PAPER_MARKER', 
        'COORDINATOR', 'STAFF'
    ].includes(role);
};

// Helper to calculate student Grade based on paper grading scale or standard defaults
const calculateGrade = (score, totalMarks, gradingScale) => {
    if (score === null || score === undefined) return null;
    let percentage = (totalMarks && totalMarks > 0) ? (score / totalMarks) * 100 : score;
    percentage = Math.round(percentage * 10) / 10;

    let parsedScale = gradingScale;
    if (typeof parsedScale === 'string') {
        try { parsedScale = JSON.parse(parsedScale); } catch (e) { parsedScale = null; }
    }

    if (parsedScale && Array.isArray(parsedScale) && parsedScale.length > 0) {
        for (const tier of parsedScale) {
            const min = parseFloat(tier.min !== undefined ? tier.min : 0);
            const max = parseFloat(tier.max !== undefined ? tier.max : 100);
            if (percentage >= min && percentage <= max) {
                return tier.grade;
            }
        }
    }
    // Fallback standard grading if no custom scale matches
    if (percentage >= 75) return 'A';
    if (percentage >= 65) return 'B';
    if (percentage >= 55) return 'C';
    if (percentage >= 35) return 'S';
    return 'F';
};

// 1. Get Paper Config & Details
exports.getPaperByContentId = async (req, res) => {
    try {
        const contentId = parseInt(req.params.contentId);
        if (!contentId) return res.status(400).json({ error: "Invalid content ID" });

        const userId = req.user?.userId || req.user?.id;
        const isTeacher = isStaffOrTeacher(req.user);

        const content = await prisma.content.findUnique({
            where: { id: contentId },
            include: {
                paper: {
                    include: {
                        questions: {
                            orderBy: { questionNo: 'asc' },
                            include: {
                                options: {
                                    orderBy: { optionNo: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!content) return res.status(404).json({ error: "Content not found" });

        let paper = content.paper;

        // If no paper object exists yet, create default one
        if (!paper) {
            const defaultPaperType = (content.contentType === 'sPaper' || content.contentType === '4') ? 'STRUCTURED' : 'MCQ';
            paper = await prisma.paper.create({
                data: {
                    contentId: content.id,
                    paperType: defaultPaperType,
                    timerMode: 'FLEXIBLE',
                    durationMinutes: content.paperTime || 60,
                    mcqDurationMinutes: 30,
                    structuredDurationMinutes: 60,
                    totalMarks: 100,
                    totalMcqMarks: 50,
                    totalStructuredMarks: 50,
                    passMarks: 40,
                    instructions: "Please read all questions carefully before submitting."
                },
                include: {
                    questions: {
                        include: { options: true }
                    }
                }
            });
        }

        // Get student's submission if student is logged in
        let userSubmission = null;
        if (userId) {
            userSubmission = await prisma.paperSubmission.findUnique({
                where: {
                    paperId_studentId: {
                        paperId: paper.id,
                        studentId: userId
                    }
                },
                include: {
                    answers: true
                }
            });
        }

        // If not a teacher and student has NOT finished/submitted, do NOT reveal `isCorrect` flags!
        const isSubmitted = userSubmission && (userSubmission.status === 'SUBMITTED' || userSubmission.status === 'GRADED' || userSubmission.status === 'PENDING_EVALUATION');
        
        let sanitizedQuestions = (paper.questions || []).map(q => {
            let images = [];
            if (q.image) {
                try {
                    const parsed = JSON.parse(q.image);
                    if (Array.isArray(parsed)) {
                        images = parsed.filter(Boolean);
                    } else if (typeof parsed === 'string' && parsed.trim()) {
                        images = [parsed.trim()];
                    } else {
                        images = [q.image];
                    }
                } catch {
                    images = [q.image];
                }
            }

            return {
                id: q.id,
                questionNo: q.questionNo,
                questionText: q.questionText,
                image: images.length > 0 ? images[0] : (q.image || null),
                images: images,
                marks: q.marks,
                options: (q.options || []).map(opt => ({
                    id: opt.id,
                    optionNo: opt.optionNo,
                    optionText: opt.optionText,
                    // Only expose isCorrect to teachers/markers or after student has submitted
                    ...(isTeacher || isSubmitted ? { isCorrect: opt.isCorrect } : {})
                }))
            };
        });

        res.json({
            content: {
                id: content.id,
                title: content.title,
                thumbnail: content.thumbnail,
                fileName: content.fileName,
                contentType: content.contentType,
                paperTime: content.paperTime,
                questionCount: content.questionCount,
                date: content.date,
                startTime: content.startTime,
                endTime: content.endTime,
                batchId: content.batchId
            },
            paper: {
                id: paper.id,
                paperType: paper.paperType, // "MCQ", "STRUCTURED", "BOTH"
                timerMode: paper.timerMode,
                scheduledStartTime: paper.scheduledStartTime,
                mcqTimerMode: paper.mcqTimerMode || paper.timerMode || 'FLEXIBLE',
                mcqScheduledStartTime: paper.mcqScheduledStartTime || paper.scheduledStartTime,
                structuredTimerMode: paper.structuredTimerMode || paper.timerMode || 'FLEXIBLE',
                structuredScheduledStartTime: paper.structuredScheduledStartTime || paper.scheduledStartTime,
                breakIntervalMinutes: paper.breakIntervalMinutes !== null && paper.breakIntervalMinutes !== undefined ? paper.breakIntervalMinutes : 15,
                structuredUploadMinutes: paper.structuredUploadMinutes !== null && paper.structuredUploadMinutes !== undefined ? paper.structuredUploadMinutes : 15,
                durationMinutes: paper.durationMinutes,
                mcqDurationMinutes: paper.mcqDurationMinutes || 30,
                structuredDurationMinutes: paper.structuredDurationMinutes || 60,
                totalMarks: paper.totalMarks || 100,
                totalMcqMarks: paper.totalMcqMarks || 50,
                totalStructuredMarks: paper.totalStructuredMarks || 50,
                passMarks: paper.passMarks || 40,
                gradingScale: paper.gradingScale ? (typeof paper.gradingScale === 'string' ? JSON.parse(paper.gradingScale) : paper.gradingScale) : null,
                category: paper.category || 'WEEKLY',
                manualParticipantCount: paper.manualParticipantCount || null,
                instructions: paper.instructions,
                mcqPaperFile: paper.mcqPaperFile,
                structuredPaperFile: paper.structuredPaperFile || content.fileName,
                questions: sanitizedQuestions
            },
            userSubmission: userSubmission ? {
                id: userSubmission.id,
                startedAt: userSubmission.startedAt,
                submittedAt: userSubmission.submittedAt,
                mcqSubmittedAt: userSubmission.mcqSubmittedAt,
                structuredStartedAt: userSubmission.structuredStartedAt,
                structuredSubmittedAt: userSubmission.structuredSubmittedAt,
                isUploadLocked: Boolean(userSubmission.isUploadLocked),
                status: userSubmission.status,
                score: userSubmission.score,
                grade: calculateGrade(userSubmission.score, paper.totalMarks, paper.gradingScale),
                mcqScore: userSubmission.mcqScore,
                structuredScore: userSubmission.structuredScore,
                totalQuestions: userSubmission.totalQuestions,
                correctAnswers: userSubmission.correctAnswers,
                answerFile: userSubmission.answerFile,
                answerImages: userSubmission.answerImages ? JSON.parse(userSubmission.answerImages) : [],
                teacherFeedback: userSubmission.teacherFeedback,
                gradedBy: userSubmission.gradedBy,
                gradedAt: userSubmission.gradedAt,
                answers: userSubmission.answers
            } : null,
            serverTime: new Date()
        });

    } catch (err) {
        console.error("getPaperByContentId Error:", err);
        res.status(500).json({ error: "Failed to load paper details" });
    }
};

// 2. Save Paper Configuration (Admin/Lecturer)
exports.savePaperConfig = async (req, res) => {
    try {
        const { 
            contentId, 
            paperType, 
            timerMode, 
            scheduledStartTime, 
            mcqTimerMode,
            mcqScheduledStartTime,
            structuredTimerMode,
            structuredScheduledStartTime,
            breakIntervalMinutes,
            structuredUploadMinutes,
            durationMinutes, 
            mcqDurationMinutes, 
            structuredDurationMinutes, 
            totalMarks, 
            totalMcqMarks, 
            totalStructuredMarks, 
            passMarks, 
            instructions,
            gradingScale,
            category,
            manualParticipantCount,
            mcqPaperFile,
            structuredPaperFile
        } = req.body;
        
        if (!contentId) return res.status(400).json({ error: "contentId is required" });

        const parsedContentId = parseInt(contentId);
        const parsedDuration = parseInt(durationMinutes || 60);
        const parsedStartTime = scheduledStartTime ? new Date(scheduledStartTime) : null;
        const parsedMcqStartTime = mcqScheduledStartTime ? new Date(mcqScheduledStartTime) : (timerMode === 'SCHEDULED' ? parsedStartTime : null);
        const parsedStructStartTime = structuredScheduledStartTime ? new Date(structuredScheduledStartTime) : (timerMode === 'SCHEDULED' ? parsedStartTime : null);
        const validPaperType = ['MCQ', 'STRUCTURED', 'BOTH'].includes(paperType) ? paperType : 'MCQ';

        const resolvedMcqTimer = mcqTimerMode || timerMode || 'FLEXIBLE';
        const resolvedStructTimer = structuredTimerMode || timerMode || 'FLEXIBLE';

        const parsedCategory = category && ['WEEKLY', 'MONTHLY'].includes(String(category).toUpperCase()) ? String(category).toUpperCase() : 'WEEKLY';
        const parsedParticipantCount = manualParticipantCount !== undefined && manualParticipantCount !== null && manualParticipantCount !== '' ? parseInt(manualParticipantCount) : null;

        let parsedGradingScale = undefined;
        if (gradingScale !== undefined && gradingScale !== null && gradingScale !== '') {
            parsedGradingScale = typeof gradingScale === 'string' ? gradingScale : JSON.stringify(gradingScale);
        }

        const updateData = {
            paperType: validPaperType,
            category: parsedCategory,
            manualParticipantCount: parsedParticipantCount,
            timerMode: timerMode || (resolvedMcqTimer === 'SCHEDULED' || resolvedStructTimer === 'SCHEDULED' ? 'SCHEDULED' : 'FLEXIBLE'),
            scheduledStartTime: parsedStartTime || parsedMcqStartTime || parsedStructStartTime,
            mcqTimerMode: resolvedMcqTimer,
            mcqScheduledStartTime: parsedMcqStartTime,
            structuredTimerMode: resolvedStructTimer,
            structuredScheduledStartTime: parsedStructStartTime,
            breakIntervalMinutes: breakIntervalMinutes !== undefined && breakIntervalMinutes !== '' ? parseInt(breakIntervalMinutes) : 15,
            structuredUploadMinutes: structuredUploadMinutes !== undefined && structuredUploadMinutes !== '' ? parseInt(structuredUploadMinutes) : 15,
            durationMinutes: parsedDuration,
            mcqDurationMinutes: mcqDurationMinutes !== undefined ? parseInt(mcqDurationMinutes) : 30,
            structuredDurationMinutes: structuredDurationMinutes !== undefined ? parseInt(structuredDurationMinutes) : 60,
            totalMarks: totalMarks ? parseFloat(totalMarks) : 100,
            totalMcqMarks: totalMcqMarks ? parseFloat(totalMcqMarks) : 50,
            totalStructuredMarks: totalStructuredMarks ? parseFloat(totalStructuredMarks) : 50,
            passMarks: passMarks ? parseFloat(passMarks) : 40,
            instructions: instructions || null,
            ...(parsedGradingScale !== undefined ? { gradingScale: parsedGradingScale } : {}),
            ...(mcqPaperFile !== undefined ? { mcqPaperFile } : {}),
            ...(structuredPaperFile !== undefined ? { structuredPaperFile } : {})
        };

        const paper = await prisma.paper.upsert({
            where: { contentId: parsedContentId },
            update: updateData,
            create: {
                contentId: parsedContentId,
                ...updateData
            }
        });

        // Also sync durationMinutes back to Content.paperTime
        await prisma.content.update({
            where: { id: parsedContentId },
            data: { paperTime: parsedDuration }
        });

        res.json({ message: "Paper settings saved successfully", paper });
    } catch (err) {
        console.error("savePaperConfig Error:", err);
        res.status(500).json({ error: "Failed to save paper configuration" });
    }
};

// 3. Save Questions & Answers (Bulk save/edit for MCQ)
exports.saveQuestions = async (req, res) => {
    try {
        const { paperId, questions } = req.body;
        if (!paperId) return res.status(400).json({ error: "paperId is required" });
        if (!Array.isArray(questions)) return res.status(400).json({ error: "questions must be an array" });

        const parsedPaperId = parseInt(paperId);

        // Run in transaction to replace questions
        await prisma.$transaction(async (tx) => {
            // Delete old questions (Cascade will delete options)
            await tx.paperQuestion.deleteMany({
                where: { paperId: parsedPaperId }
            });

            // Insert new questions and options
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                let storedImage = null;
                if (Array.isArray(q.images) && q.images.length > 0) {
                    const validImages = q.images.filter(img => typeof img === 'string' && img.trim().length > 0);
                    if (validImages.length === 1) {
                        storedImage = validImages[0];
                    } else if (validImages.length > 1) {
                        storedImage = JSON.stringify(validImages);
                    }
                } else if (typeof q.image === 'string' && q.image.trim().length > 0) {
                    storedImage = q.image.trim();
                }

                const createdQuestion = await tx.paperQuestion.create({
                    data: {
                        paperId: parsedPaperId,
                        questionNo: q.questionNo || (i + 1),
                        questionText: q.questionText || `Question ${i + 1}`,
                        image: storedImage,
                        marks: q.marks ? parseFloat(q.marks) : 1.0
                    }
                });

                if (Array.isArray(q.options) && q.options.length > 0) {
                    const optionsData = q.options.map((opt, optIdx) => ({
                        questionId: createdQuestion.id,
                        optionNo: opt.optionNo || (optIdx + 1),
                        optionText: opt.optionText || '',
                        isCorrect: Boolean(opt.isCorrect)
                    }));

                    await tx.paperOption.createMany({
                        data: optionsData
                    });
                }
            }

            // Sync questionCount to Content
            const paper = await tx.paper.findUnique({
                where: { id: parsedPaperId },
                select: { contentId: true }
            });
            if (paper) {
                await tx.content.update({
                    where: { id: paper.contentId },
                    data: { questionCount: questions.length }
                });
            }
        });

        res.json({ message: "Questions saved successfully", count: questions.length });
    } catch (err) {
        console.error("saveQuestions Error:", err);
        res.status(500).json({ error: "Failed to save questions" });
    }
};

// 4. Start Paper (Student starts exam)
exports.startPaper = async (req, res) => {
    try {
        const paperId = parseInt(req.params.paperId);
        const studentId = req.user?.userId || req.user?.id;
        const section = (req.body?.section || req.query?.section || '').toUpperCase();

        if (!paperId || !studentId) return res.status(400).json({ error: "Missing paperId or studentId" });

        const paper = await prisma.paper.findUnique({
            where: { id: paperId }
        });

        if (!paper) return res.status(404).json({ error: "Paper not found" });

        // Check if student already started
        let submission = await prisma.paperSubmission.findUnique({
            where: {
                paperId_studentId: {
                    paperId,
                    studentId
                }
            }
        });

        const now = new Date();

        if (!submission) {
            submission = await prisma.paperSubmission.create({
                data: {
                    paperId,
                    studentId,
                    startedAt: now,
                    ...(section === 'STRUCTURED' ? { structuredStartedAt: now } : {}),
                    status: "IN_PROGRESS"
                }
            });
        } else {
            // If starting structured section and timestamp not recorded yet
            if (section === 'STRUCTURED' && !submission.structuredStartedAt) {
                submission = await prisma.paperSubmission.update({
                    where: { id: submission.id },
                    data: {
                        structuredStartedAt: now
                    }
                });
            }
        }

        res.json({
            message: "Paper session started",
            submission,
            serverTime: new Date()
        });
    } catch (err) {
        console.error("startPaper Error:", err);
        res.status(500).json({ error: "Failed to start paper" });
    }
};

// Helper to extract uploaded files (single answerFile and/or multiple answerImages)
const extractUploadedFiles = (req) => {
    let answerFile = null;
    let answerImages = [];

    // Check req.files
    if (req.files) {
        if (Array.isArray(req.files)) {
            req.files.forEach(f => {
                const ext = path.extname(f.originalname || f.filename).toLowerCase();
                if (ext === '.pdf') {
                    if (!answerFile) answerFile = f.filename;
                } else {
                    answerImages.push(f.filename);
                }
            });
        } else {
            if (req.files['answerFile'] && req.files['answerFile'].length > 0) {
                answerFile = req.files['answerFile'][0].filename;
            }
            if (req.files['answerImages'] && req.files['answerImages'].length > 0) {
                answerImages = req.files['answerImages'].map(f => f.filename);
            }
        }
    } else if (req.file) {
        const ext = path.extname(req.file.originalname || req.file.filename).toLowerCase();
        if (ext === '.pdf') {
            answerFile = req.file.filename;
        } else {
            answerImages.push(req.file.filename);
        }
    }

    // Fallbacks from body if sent as strings or URLs
    if (!answerFile && req.body.answerFile) {
        answerFile = req.body.answerFile;
    }
    if (answerImages.length === 0 && req.body.answerImages) {
        try {
            const parsed = typeof req.body.answerImages === 'string' ? JSON.parse(req.body.answerImages) : req.body.answerImages;
            if (Array.isArray(parsed)) answerImages = parsed;
        } catch(e) {
            if (typeof req.body.answerImages === 'string') answerImages = [req.body.answerImages];
        }
    }

    return { answerFile, answerImages };
};

// 5. Submit Paper (MCQ, STRUCTURED, or BOTH)
exports.submitPaper = async (req, res) => {
    try {
        const paperId = parseInt(req.params.paperId);
        const studentId = req.user?.userId || req.user?.id;
        const requestedSection = (req.body.section || req.query.section || '').toUpperCase();

        if (!paperId || !studentId) return res.status(400).json({ error: "Missing paperId or studentId" });

        const paper = await prisma.paper.findUnique({
            where: { id: paperId },
            include: {
                questions: {
                    include: { options: true }
                }
            }
        });

        if (!paper) return res.status(404).json({ error: "Paper not found" });

        let submission = await prisma.paperSubmission.findUnique({
            where: {
                paperId_studentId: {
                    paperId,
                    studentId
                }
            }
        });

        if (!submission) {
            submission = await prisma.paperSubmission.create({
                data: {
                    paperId,
                    studentId,
                    startedAt: new Date(),
                    status: "IN_PROGRESS"
                }
            });
        }

        const { answerFile, answerImages } = extractUploadedFiles(req);

        // Helper to evaluate MCQ questions
        const gradeMcqSection = (answersArray) => {
            let totalCorrect = 0;
            let totalQuestions = paper.questions.length;
            let totalPossibleMarks = 0;
            let totalEarnedMarks = 0;
            const answersToCreate = [];

            (paper.questions || []).forEach(q => {
                const qMarks = q.marks || 1;
                totalPossibleMarks += qMarks;
                const studentAns = Array.isArray(answersArray) ? answersArray.find(a => a.questionId === q.id) : null;
                const correctOption = q.options.find(opt => opt.isCorrect);

                const isCorrect = Boolean(studentAns && correctOption && studentAns.selectedOptionId === correctOption.id);

                if (isCorrect) {
                    totalCorrect++;
                    totalEarnedMarks += qMarks;
                }

                answersToCreate.push({
                    questionId: q.id,
                    selectedOptionId: studentAns?.selectedOptionId || null,
                    isCorrect
                });
            });

            const totalMaxMarks = paper.paperType === 'BOTH' ? (paper.totalMcqMarks || 50) : (paper.totalMarks || 100);
            const score = totalPossibleMarks > 0 ? parseFloat(((totalEarnedMarks / totalPossibleMarks) * totalMaxMarks).toFixed(2)) : 0;

            return { score, totalCorrect, totalQuestions, answersToCreate };
        };

        // Helper to validate structured upload deadline
        const validateStructuredUploadWindow = () => {
            const writingMins = paper.structuredDurationMinutes || 60;
            const uploadMins = paper.structuredUploadMinutes || 15;
            const totalAllowedMins = writingMins + uploadMins;

            let startRefMs = null;
            if (paper.structuredTimerMode === 'SCHEDULED' && paper.structuredScheduledStartTime) {
                startRefMs = new Date(paper.structuredScheduledStartTime).getTime();
            } else if (submission.structuredStartedAt) {
                startRefMs = new Date(submission.structuredStartedAt).getTime();
            } else if (submission.startedAt) {
                startRefMs = new Date(submission.startedAt).getTime();
            }

            if (!startRefMs) return { isExpired: false };

            const deadlineMs = startRefMs + (totalAllowedMins * 60 * 1000);
            const gracePeriodMs = 90 * 1000; // 90 seconds grace for network upload latency
            const nowMs = Date.now();

            if (nowMs > (deadlineMs + gracePeriodMs)) {
                return { isExpired: true, deadline: new Date(deadlineMs) };
            }
            return { isExpired: false, deadline: new Date(deadlineMs) };
        };

        // Parse answers if passed as JSON string
        let rawAnswers = req.body.answers;
        if (typeof rawAnswers === 'string') {
            try { rawAnswers = JSON.parse(rawAnswers); } catch(e) { rawAnswers = []; }
        }

        // =====================================
        // CASE 1: MCQ ONLY
        // =====================================
        if (paper.paperType === 'MCQ') {
            const mcqResult = gradeMcqSection(rawAnswers);

            await prisma.$transaction(async (tx) => {
                await tx.paperSubmissionAnswer.deleteMany({
                    where: { submissionId: submission.id }
                });

                for (const sa of mcqResult.answersToCreate) {
                    await tx.paperSubmissionAnswer.create({
                        data: {
                            submissionId: submission.id,
                            questionId: sa.questionId,
                            selectedOptionId: sa.selectedOptionId,
                            isCorrect: sa.isCorrect
                        }
                    });
                }

                submission = await tx.paperSubmission.update({
                    where: { id: submission.id },
                    data: {
                        status: "SUBMITTED",
                        submittedAt: new Date(),
                        mcqSubmittedAt: new Date(),
                        score: mcqResult.score,
                        mcqScore: mcqResult.score,
                        totalQuestions: mcqResult.totalQuestions,
                        correctAnswers: mcqResult.totalCorrect
                    },
                    include: { answers: true }
                });
            });

            return res.json({
                message: "MCQ Paper submitted successfully!",
                score: submission.score,
                mcqScore: submission.mcqScore,
                correctAnswers: submission.correctAnswers,
                totalQuestions: submission.totalQuestions,
                passMarks: paper.passMarks,
                isPassed: submission.score >= (paper.passMarks || 40),
                submission
            });
        }

        // =====================================
        // CASE 2: STRUCTURED ONLY
        // =====================================
        else if (paper.paperType === 'STRUCTURED') {
            // Validate upload window
            const uploadWindowCheck = validateStructuredUploadWindow();
            if (uploadWindowCheck.isExpired) {
                await prisma.paperSubmission.update({
                    where: { id: submission.id },
                    data: { isUploadLocked: true }
                });
                return res.status(403).json({
                    error: "The upload time window has expired. Submissions are now closed.",
                    isUploadLocked: true
                });
            }

            if (!answerFile && answerImages.length === 0 && !submission.answerFile && !submission.answerImages) {
                return res.status(400).json({ error: "Please upload your answer sheet (PDF or clear photos)." });
            }

            const existingImages = submission.answerImages ? JSON.parse(submission.answerImages) : [];
            const mergedImages = [...existingImages, ...answerImages];

            submission = await prisma.paperSubmission.update({
                where: { id: submission.id },
                data: {
                    status: "PENDING_EVALUATION",
                    submittedAt: new Date(),
                    structuredSubmittedAt: new Date(),
                    answerFile: answerFile || submission.answerFile,
                    answerImages: mergedImages.length > 0 ? JSON.stringify(mergedImages) : submission.answerImages
                }
            });

            return res.json({
                message: "Structured Paper submitted successfully! Awaiting marker evaluation.",
                status: "PENDING_EVALUATION",
                submission
            });
        }

        // =====================================
        // CASE 3: BOTH (MCQ + STRUCTURED)
        // =====================================
        else if (paper.paperType === 'BOTH') {
            // Subcase 3A: Student submitting Part 1 (MCQ only)
            if (requestedSection === 'MCQ' || requestedSection === 'PART1') {
                const mcqResult = gradeMcqSection(rawAnswers);

                await prisma.$transaction(async (tx) => {
                    if (mcqResult.answersToCreate.length > 0) {
                        await tx.paperSubmissionAnswer.deleteMany({
                            where: { submissionId: submission.id }
                        });

                        for (const sa of mcqResult.answersToCreate) {
                            await tx.paperSubmissionAnswer.create({
                                data: {
                                    submissionId: submission.id,
                                    questionId: sa.questionId,
                                    selectedOptionId: sa.selectedOptionId,
                                    isCorrect: sa.isCorrect
                                }
                            });
                        }
                    }

                    submission = await tx.paperSubmission.update({
                        where: { id: submission.id },
                        data: {
                            mcqSubmittedAt: new Date(),
                            score: mcqResult.score,
                            mcqScore: mcqResult.score,
                            totalQuestions: mcqResult.totalQuestions,
                            correctAnswers: mcqResult.totalCorrect
                        },
                        include: { answers: true }
                    });
                });

                return res.json({
                    message: "Part 1 (MCQ) completed! Your MCQ score has been recorded.",
                    section: 'MCQ',
                    score: submission.score,
                    mcqScore: submission.mcqScore,
                    correctAnswers: submission.correctAnswers,
                    totalQuestions: submission.totalQuestions,
                    submission
                });
            }

            // Subcase 3B: Student submitting Part 2 (STRUCTURED) or Final combined submission
            const uploadWindowCheck = validateStructuredUploadWindow();
            if (uploadWindowCheck.isExpired) {
                await prisma.paperSubmission.update({
                    where: { id: submission.id },
                    data: { isUploadLocked: true }
                });
                return res.status(403).json({
                    error: "The upload time window has expired. Submissions are now closed.",
                    isUploadLocked: true
                });
            }

            let mcqResult = null;
            if (Array.isArray(rawAnswers) && rawAnswers.length > 0) {
                mcqResult = gradeMcqSection(rawAnswers);
            }

            const existingImages = submission.answerImages ? JSON.parse(submission.answerImages) : [];
            const mergedImages = [...existingImages, ...answerImages];

            await prisma.$transaction(async (tx) => {
                if (mcqResult && mcqResult.answersToCreate.length > 0) {
                    await tx.paperSubmissionAnswer.deleteMany({
                        where: { submissionId: submission.id }
                    });

                    for (const sa of mcqResult.answersToCreate) {
                        await tx.paperSubmissionAnswer.create({
                            data: {
                                submissionId: submission.id,
                                questionId: sa.questionId,
                                selectedOptionId: sa.selectedOptionId,
                                isCorrect: sa.isCorrect
                            }
                        });
                    }
                }

                const finalMcqScore = mcqResult ? mcqResult.score : (submission.mcqScore || 0);

                submission = await tx.paperSubmission.update({
                    where: { id: submission.id },
                    data: {
                        status: "PENDING_EVALUATION",
                        submittedAt: new Date(),
                        structuredSubmittedAt: new Date(),
                        score: finalMcqScore, // Reflects MCQ score until structured section is marked
                        mcqScore: finalMcqScore,
                        totalQuestions: mcqResult ? mcqResult.totalQuestions : submission.totalQuestions,
                        correctAnswers: mcqResult ? mcqResult.totalCorrect : submission.correctAnswers,
                        answerFile: answerFile || submission.answerFile,
                        answerImages: mergedImages.length > 0 ? JSON.stringify(mergedImages) : submission.answerImages
                    },
                    include: { answers: true }
                });
            });

            return res.json({
                message: "Ranking Test submitted successfully! MCQ marks calculated, Structured section is pending marker evaluation.",
                score: submission.score,
                mcqScore: submission.mcqScore,
                structuredScore: null,
                correctAnswers: submission.correctAnswers,
                totalQuestions: submission.totalQuestions,
                status: "PENDING_EVALUATION",
                passMarks: paper.passMarks,
                submission
            });
        }

    } catch (err) {
        console.error("submitPaper Error:", err);
        res.status(500).json({ error: "Failed to submit paper" });
    }
};

// 6. Get All Submissions for a Paper (Admin / Lecturer / Guider / Marker)
exports.getPaperSubmissions = async (req, res) => {
    try {
        const paperId = parseInt(req.params.paperId);
        if (!paperId) return res.status(400).json({ error: "paperId is required" });

        const submissions = await prisma.paperSubmission.findMany({
            where: { paperId },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        image: true,
                        city: true
                    }
                },
                paper: {
                    select: {
                        totalMarks: true,
                        passMarks: true,
                        gradingScale: true
                    }
                },
                answers: true
            },
            orderBy: { submittedAt: 'desc' }
        });

        const formatted = submissions.map(sub => ({
            ...sub,
            grade: calculateGrade(sub.score, sub.paper?.totalMarks, sub.paper?.gradingScale),
            answerImages: sub.answerImages ? JSON.parse(sub.answerImages) : []
        }));

        res.json({ submissions: formatted });
    } catch (err) {
        console.error("getPaperSubmissions Error:", err);
        res.status(500).json({ error: "Failed to get submissions" });
    }
};

// 7. Grade Structured Paper Submission (Lecturer / Paper Marker)
exports.gradeStructuredSubmission = async (req, res) => {
    try {
        const submissionId = parseInt(req.params.submissionId);
        const { score, teacherFeedback } = req.body;

        if (!submissionId) return res.status(400).json({ error: "submissionId is required" });

        const existingSub = await prisma.paperSubmission.findUnique({
            where: { id: submissionId },
            include: { paper: true }
        });

        if (!existingSub) return res.status(404).json({ error: "Submission not found" });

        const parsedStructuredScore = score !== undefined ? parseFloat(score) : 0;
        let finalScore = parsedStructuredScore;

        if (existingSub.paper?.paperType === 'BOTH') {
            finalScore = parseFloat(((existingSub.mcqScore || 0) + parsedStructuredScore).toFixed(2));
        }

        const markerId = req.user?.userId || req.user?.id;

        const updated = await prisma.paperSubmission.update({
            where: { id: submissionId },
            data: {
                structuredScore: parsedStructuredScore,
                score: finalScore,
                teacherFeedback: teacherFeedback || null,
                status: "GRADED",
                gradedBy: markerId ? parseInt(markerId) : null,
                gradedAt: new Date()
            }
        });

        res.json({ 
            message: "Submission graded successfully", 
            submission: {
                ...updated,
                answerImages: updated.answerImages ? JSON.parse(updated.answerImages) : []
            } 
        });
    } catch (err) {
        console.error("gradeStructuredSubmission Error:", err);
        res.status(500).json({ error: "Failed to grade submission" });
    }
};

// 8. Get Paper Leaderboard
exports.getPaperLeaderboard = async (req, res) => {
    try {
        const paperId = parseInt(req.params.paperId);
        if (!paperId) return res.status(400).json({ error: "paperId is required" });

        const paper = await prisma.paper.findUnique({
            where: { id: paperId },
            include: { 
                content: {
                    select: { id: true, title: true }
                }
            }
        });
        if (!paper) return res.status(404).json({ error: "Paper not found" });

        const submissions = await prisma.paperSubmission.findMany({
            where: {
                paperId,
                status: { in: ['SUBMITTED', 'GRADED', 'PENDING_EVALUATION'] }
            },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        image: true,
                        city: true,
                        district: true
                    }
                }
            },
            orderBy: [
                { score: 'desc' },
                { submittedAt: 'asc' }
            ]
        });

        let currentRank = 0;
        let lastScore = null;
        const rankedList = submissions.map((sub, index) => {
            if (sub.score !== lastScore) {
                currentRank = index + 1;
                lastScore = sub.score;
            }
            let durationSeconds = null;
            if (sub.startedAt && sub.submittedAt) {
                durationSeconds = Math.max(0, Math.floor((new Date(sub.submittedAt).getTime() - new Date(sub.startedAt).getTime()) / 1000));
            }

            return {
                id: sub.id,
                rank: currentRank,
                submissionId: sub.id,
                student: {
                    id: sub.student.id,
                    name: `${sub.student.firstName || ''} ${sub.student.lastName || ''}`.trim() || 'Student',
                    firstName: sub.student.firstName,
                    lastName: sub.student.lastName,
                    image: sub.student.image,
                    city: sub.student.city || sub.student.district || 'IMA Campus'
                },
                score: sub.score || 0,
                grade: calculateGrade(sub.score, paper.totalMarks, paper.gradingScale),
                mcqScore: sub.mcqScore || 0,
                structuredScore: sub.structuredScore || 0,
                status: sub.status,
                durationSeconds,
                durationMinutes: durationSeconds ? Math.round(durationSeconds / 60) : 0,
                submittedAt: sub.submittedAt
            };
        });

        const totalParticipants = paper.manualParticipantCount && paper.manualParticipantCount > 0 
            ? paper.manualParticipantCount 
            : rankedList.length;

        // Podium: Top 3 (1st, 2nd, 3rd)
        const podium = {
            first: rankedList[0] || null,
            second: rankedList[1] || null,
            third: rankedList[2] || null
        };

        // Calling student's standing / rank
        const callingUserId = req.user?.userId || req.user?.id;
        let myStanding = null;
        if (callingUserId) {
            const foundIdx = rankedList.findIndex(r => String(r.student?.id) === String(callingUserId));
            if (foundIdx !== -1) {
                const me = rankedList[foundIdx];
                myStanding = {
                    ...me,
                    totalParticipants,
                    isPodium: me.rank <= 3,
                    topScore: rankedList[0]?.score || 0,
                    scoreGap: rankedList[0] ? parseFloat(((rankedList[0].score || 0) - (me.score || 0)).toFixed(2)) : 0
                };
            }
        }

        res.json({
            paper: {
                id: paper.id,
                title: paper.content?.title || 'Ranking Test',
                paperType: paper.paperType,
                category: paper.category || 'WEEKLY',
                totalMarks: paper.totalMarks || 100,
                passMarks: paper.passMarks || 40,
                gradingScale: paper.gradingScale ? (() => {
                    try {
                        return typeof paper.gradingScale === 'string' ? JSON.parse(paper.gradingScale) : paper.gradingScale;
                    } catch (e) {
                        return null;
                    }
                })() : null,
                manualParticipantCount: paper.manualParticipantCount || null
            },
            totalParticipants,
            manualParticipantCount: paper.manualParticipantCount || null,
            actualSubmissionsCount: rankedList.length,
            podium,
            myStanding,
            leaderboard: rankedList
        });
    } catch (err) {
        console.error("getPaperLeaderboard Error:", err);
        res.status(500).json({ error: "Failed to load leaderboard" });
    }
};

// 9. Get Student Paper Progress (Weekly vs Monthly Analytics & Charts)
exports.getStudentPaperProgress = async (req, res) => {
    try {
        const studentId = req.user?.userId || req.user?.id;
        if (!studentId) return res.status(401).json({ error: "Unauthorized" });

        const submissions = await prisma.paperSubmission.findMany({
            where: { 
                studentId,
                status: { in: ['SUBMITTED', 'GRADED', 'PENDING_EVALUATION'] }
            },
            include: {
                paper: {
                    include: {
                        content: {
                            select: {
                                id: true,
                                title: true,
                                batchId: true,
                                courseId: true,
                                date: true
                            }
                        }
                    }
                }
            },
            orderBy: { submittedAt: 'desc' }
        });

        // Compute rank and total participants for each submission
        const enrichedSubmissions = await Promise.all(submissions.map(async (s) => {
            const higherScoreCount = await prisma.paperSubmission.count({
                where: {
                    paperId: s.paperId,
                    status: { in: ['SUBMITTED', 'GRADED', 'PENDING_EVALUATION'] },
                    score: { gt: s.score || 0 }
                }
            });
            const actualTotalInPaper = await prisma.paperSubmission.count({
                where: {
                    paperId: s.paperId,
                    status: { in: ['SUBMITTED', 'GRADED', 'PENDING_EVALUATION'] }
                }
            });

            const rank = higherScoreCount + 1;
            const officialParticipants = s.paper?.manualParticipantCount && s.paper.manualParticipantCount > 0 
                ? s.paper.manualParticipantCount 
                : actualTotalInPaper;

            const totalMarks = s.paper?.totalMarks || 100;
            const percentage = totalMarks > 0 ? parseFloat((((s.score || 0) / totalMarks) * 100).toFixed(1)) : 0;
            const category = s.paper?.category || 'WEEKLY';
            const paperType = s.paper?.paperType || 'MCQ';

            return {
                id: s.id,
                paperId: s.paperId,
                contentId: s.paper?.content?.id,
                testTitle: s.paper?.content?.title || 'Ranking Test',
                category,
                paperType,
                score: s.score || 0,
                mcqScore: s.mcqScore || 0,
                structuredScore: s.structuredScore || 0,
                totalMarks,
                passMarks: s.paper?.passMarks || 40,
                percentage,
                rank,
                grade: calculateGrade(s.score, totalMarks, s.paper?.gradingScale),
                totalParticipants: officialParticipants,
                isPassed: (s.score || 0) >= (s.paper?.passMarks || 40),
                status: s.status,
                submittedAt: s.submittedAt,
                teacherFeedback: s.teacherFeedback
            };
        }));

        // Helper to compute summary for a group
        const computeGroupSummary = (list) => {
            const total = list.length;
            if (total === 0) {
                return { totalTaken: 0, averageScore: 0, highestScore: 0, averagePercentage: 0, passCount: 0, passRate: 0, history: [] };
            }
            const totalScore = list.reduce((sum, item) => sum + item.score, 0);
            const totalPerc = list.reduce((sum, item) => sum + item.percentage, 0);
            const highestScore = Math.max(...list.map(i => i.score));
            const passCount = list.filter(i => i.isPassed).length;

            return {
                totalTaken: total,
                averageScore: parseFloat((totalScore / total).toFixed(1)),
                highestScore,
                averagePercentage: parseFloat((totalPerc / total).toFixed(1)),
                passCount,
                passRate: Math.round((passCount / total) * 100),
                history: list
            };
        };

        const weeklyList = enrichedSubmissions.filter(s => s.category === 'WEEKLY');
        const monthlyList = enrichedSubmissions.filter(s => s.category === 'MONTHLY');

        const mcqList = enrichedSubmissions.filter(s => s.paperType === 'MCQ');
        const structList = enrichedSubmissions.filter(s => s.paperType === 'STRUCTURED');
        const bothList = enrichedSubmissions.filter(s => s.paperType === 'BOTH');

        // Chronological order for chart plotting (oldest to newest)
        const chartData = [...enrichedSubmissions].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)).map(item => ({
            id: item.id,
            paperId: item.paperId,
            testTitle: item.testTitle,
            category: item.category,
            paperType: item.paperType,
            score: item.score,
            percentage: item.percentage,
            rank: item.rank,
            totalParticipants: item.totalParticipants,
            submittedAt: item.submittedAt
        }));

        res.json({
            overall: computeGroupSummary(enrichedSubmissions),
            weekly: computeGroupSummary(weeklyList),
            monthly: computeGroupSummary(monthlyList),
            byType: {
                mcq: computeGroupSummary(mcqList),
                structured: computeGroupSummary(structList),
                both: computeGroupSummary(bothList)
            },
            chartData,
            recentTests: enrichedSubmissions.slice(0, 10)
        });
    } catch (err) {
        console.error("getStudentPaperProgress Error:", err);
        res.status(500).json({ error: "Failed to load student progress" });
    }
};

// 10. Get Submissions Queue for Paper Markers
exports.getMarkerSubmissionsList = async (req, res) => {
    try {
        const user = req.user;
        const isSysAdmin = ['SYSTEM_ADMIN', 'DIRECTOR'].includes((user?.role || '').toUpperCase().replace(/[\s_-]+/g, '_'));
        const businessType = user?.businessType;
        const userBizList = businessType ? String(businessType).split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];

        const whereClause = {
            paper: {
                paperType: { in: ['STRUCTURED', 'BOTH'] }
            }
        };

        const { status, paperId } = req.query;
        if (status) {
            whereClause.status = status;
        }
        if (paperId) {
            whereClause.paperId = parseInt(paperId);
        }

        const submissions = await prisma.paperSubmission.findMany({
            where: whereClause,
            include: {
                paper: {
                    include: {
                        content: {
                            select: {
                                id: true,
                                title: true,
                                fileName: true,
                                batchId: true
                            }
                        }
                    }
                },
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        image: true,
                        city: true
                    }
                }
            },
            orderBy: { submittedAt: 'desc' },
            take: 200
        });

        let filteredSubmissions = submissions;
        if (!isSysAdmin && userBizList.length > 0) {
            const batchIds = [...new Set(submissions.map(s => s.paper?.content?.batchId).filter(Boolean))];
            const batches = await prisma.batch.findMany({
                where: { id: { in: batchIds } },
                include: { business: true }
            });
            const batchBizMap = {};
            batches.forEach(b => {
                batchBizMap[b.id] = (b.business?.name || '').toLowerCase().trim();
            });

            filteredSubmissions = submissions.filter(s => {
                const bId = s.paper?.content?.batchId;
                const bBiz = batchBizMap[bId];
                if (!bBiz) return true;
                return userBizList.some(ub => bBiz.includes(ub) || ub.includes(bBiz));
            });
        }

        const formatted = filteredSubmissions.map(s => ({
            ...s,
            answerImages: s.answerImages ? JSON.parse(s.answerImages) : []
        }));

        res.json({ submissions: formatted });
    } catch (err) {
        console.error("getMarkerSubmissionsList Error:", err);
        res.status(500).json({ error: "Failed to load marker submissions" });
    }
};

// 12. Upload Question Images / Figures (Supports multiple images for MCQ questions)
exports.uploadQuestionImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No image files uploaded" });
        }

        const uploadedFiles = req.files.map(f => ({
            filename: f.filename,
            url: `/storage/documents/${f.filename}`,
            size: f.size,
            mimetype: f.mimetype
        }));

        res.json({
            message: "Question images uploaded successfully",
            files: uploadedFiles,
            filenames: uploadedFiles.map(f => f.filename)
        });
    } catch (err) {
        console.error("uploadQuestionImages Error:", err);
        res.status(500).json({ error: "Failed to upload question images" });
    }
};

