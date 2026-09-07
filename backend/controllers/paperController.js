const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

// Helper to check if staff/admin/lecture/guider
const isStaffOrTeacher = (user) => {
    if (!user) return false;
    const role = (user.role || '').toUpperCase().replace(/[\s_-]+/g, '_');
    return ['SYSTEM_ADMIN', 'DIRECTOR', 'MANAGER', 'ASS_MANAGER', 'LECTURE', 'LECTURER', 'PAPER_GUIDER', 'COORDINATOR', 'STAFF'].includes(role);
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
            const defaultPaperType = content.contentType === 'sPaper' || content.contentType === '4' ? 'STRUCTURED' : 'MCQ';
            paper = await prisma.paper.create({
                data: {
                    contentId: content.id,
                    paperType: defaultPaperType,
                    timerMode: 'FLEXIBLE',
                    durationMinutes: content.paperTime || 60,
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
        const isSubmitted = userSubmission && userSubmission.status === 'SUBMITTED';
        
        let sanitizedQuestions = paper.questions.map(q => {
            return {
                id: q.id,
                questionNo: q.questionNo,
                questionText: q.questionText,
                image: q.image,
                marks: q.marks,
                options: q.options.map(opt => ({
                    id: opt.id,
                    optionNo: opt.optionNo,
                    optionText: opt.optionText,
                    // Only expose isCorrect to teachers or after student has submitted
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
                paperType: paper.paperType,
                timerMode: paper.timerMode,
                scheduledStartTime: paper.scheduledStartTime,
                durationMinutes: paper.durationMinutes,
                totalMarks: paper.totalMarks,
                passMarks: paper.passMarks,
                instructions: paper.instructions,
                questions: sanitizedQuestions
            },
            userSubmission: userSubmission ? {
                id: userSubmission.id,
                startedAt: userSubmission.startedAt,
                submittedAt: userSubmission.submittedAt,
                status: userSubmission.status,
                score: userSubmission.score,
                totalQuestions: userSubmission.totalQuestions,
                correctAnswers: userSubmission.correctAnswers,
                answerFile: userSubmission.answerFile,
                teacherFeedback: userSubmission.teacherFeedback,
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
        const { contentId, paperType, timerMode, scheduledStartTime, durationMinutes, totalMarks, passMarks, instructions } = req.body;
        
        if (!contentId) return res.status(400).json({ error: "contentId is required" });

        const parsedContentId = parseInt(contentId);
        const parsedDuration = parseInt(durationMinutes || 60);
        const parsedStartTime = scheduledStartTime ? new Date(scheduledStartTime) : null;

        const paper = await prisma.paper.upsert({
            where: { contentId: parsedContentId },
            update: {
                paperType: paperType || 'MCQ',
                timerMode: timerMode || 'FLEXIBLE',
                scheduledStartTime: parsedStartTime,
                durationMinutes: parsedDuration,
                totalMarks: totalMarks ? parseFloat(totalMarks) : 100,
                passMarks: passMarks ? parseFloat(passMarks) : 40,
                instructions: instructions || null
            },
            create: {
                contentId: parsedContentId,
                paperType: paperType || 'MCQ',
                timerMode: timerMode || 'FLEXIBLE',
                scheduledStartTime: parsedStartTime,
                durationMinutes: parsedDuration,
                totalMarks: totalMarks ? parseFloat(totalMarks) : 100,
                passMarks: passMarks ? parseFloat(passMarks) : 40,
                instructions: instructions || null
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
                const createdQuestion = await tx.paperQuestion.create({
                    data: {
                        paperId: parsedPaperId,
                        questionNo: q.questionNo || (i + 1),
                        questionText: q.questionText || `Question ${i + 1}`,
                        image: q.image || null,
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

// 5. Submit Paper (Student submits MCQ or Structured)
exports.submitPaper = async (req, res) => {
    try {
        const paperId = parseInt(req.params.paperId);
        const studentId = req.user?.userId || req.user?.id;

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

        // Handle MCQ Submissions with automatic server-side grading
        if (paper.paperType === 'MCQ') {
            const { answers } = req.body; // Array of { questionId, selectedOptionId }
            let totalCorrect = 0;
            let totalQuestions = paper.questions.length;
            let totalPossibleMarks = 0;
            let totalEarnedMarks = 0;

            const submissionAnswersToCreate = [];

            (paper.questions || []).forEach(q => {
                totalPossibleMarks += (q.marks || 1);
                const studentAns = Array.isArray(answers) ? answers.find(a => a.questionId === q.id) : null;
                const correctOption = q.options.find(opt => opt.isCorrect);

                const isCorrect = Boolean(studentAns && correctOption && studentAns.selectedOptionId === correctOption.id);

                if (isCorrect) {
                    totalCorrect++;
                    totalEarnedMarks += (q.marks || 1);
                }

                submissionAnswersToCreate.push({
                    questionId: q.id,
                    selectedOptionId: studentAns?.selectedOptionId || null,
                    isCorrect
                });
            });

            // Calculate percentage score (out of paper.totalMarks or 100)
            const finalScore = totalPossibleMarks > 0 ? ((totalEarnedMarks / totalPossibleMarks) * (paper.totalMarks || 100)) : 0;

            // Save in transaction
            await prisma.$transaction(async (tx) => {
                // Delete previous answers if any
                await tx.paperSubmissionAnswer.deleteMany({
                    where: { submissionId: submission.id }
                });

                // Insert all submission answers
                for (const sa of submissionAnswersToCreate) {
                    await tx.paperSubmissionAnswer.create({
                        data: {
                            submissionId: submission.id,
                            questionId: sa.questionId,
                            selectedOptionId: sa.selectedOptionId,
                            isCorrect: sa.isCorrect
                        }
                    });
                }

                // Update submission status and score
                submission = await tx.paperSubmission.update({
                    where: { id: submission.id },
                    data: {
                        status: "SUBMITTED",
                        submittedAt: new Date(),
                        score: parseFloat(finalScore.toFixed(2)),
                        totalQuestions,
                        correctAnswers: totalCorrect
                    },
                    include: {
                        answers: true
                    }
                });
            });

            return res.json({
                message: "MCQ Paper submitted successfully!",
                score: submission.score,
                correctAnswers: submission.correctAnswers,
                totalQuestions: submission.totalQuestions,
                passMarks: paper.passMarks,
                isPassed: submission.score >= (paper.passMarks || 40),
                submission
            });
        } 
        
        // Handle Structured Paper Submissions
        else {
            let answerFile = null;
            if (req.file) {
                answerFile = req.file.filename;
            } else if (req.body.answerFile) {
                answerFile = req.body.answerFile;
            }

            if (!answerFile && !submission.answerFile) {
                return res.status(400).json({ error: "Please upload your answer sheet (PDF or photos)." });
            }

            submission = await prisma.paperSubmission.update({
                where: { id: submission.id },
                data: {
                    status: "SUBMITTED",
                    submittedAt: new Date(),
                    answerFile: answerFile || submission.answerFile
                }
            });

            return res.json({
                message: "Structured Paper submitted successfully!",
                submission
            });
        }

    } catch (err) {
        console.error("submitPaper Error:", err);
        res.status(500).json({ error: "Failed to submit paper" });
    }
};

// 6. Get All Submissions for a Paper (Admin / Lecturer / Guider)
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
                answers: true
            },
            orderBy: { submittedAt: 'desc' }
        });

        res.json({ submissions });
    } catch (err) {
        console.error("getPaperSubmissions Error:", err);
        res.status(500).json({ error: "Failed to get submissions" });
    }
};

// 7. Grade Structured Paper Submission (Lecturer / Paper Guider)
exports.gradeStructuredSubmission = async (req, res) => {
    try {
        const submissionId = parseInt(req.params.submissionId);
        const { score, teacherFeedback } = req.body;

        if (!submissionId) return res.status(400).json({ error: "submissionId is required" });

        const updated = await prisma.paperSubmission.update({
            where: { id: submissionId },
            data: {
                score: score !== undefined ? parseFloat(score) : undefined,
                teacherFeedback: teacherFeedback || null,
                status: "GRADED"
            }
        });

        res.json({ message: "Submission graded successfully", submission: updated });
    } catch (err) {
        console.error("gradeStructuredSubmission Error:", err);
        res.status(500).json({ error: "Failed to grade submission" });
    }
};
