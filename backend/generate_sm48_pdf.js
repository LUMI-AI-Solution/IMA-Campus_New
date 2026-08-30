const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generateSM48PDF() {
  console.log("Starting Refined SM48 Master System Specification PDF generation...");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SM48 — Master Enterprise System Specification & Commercial Proposal</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

  @page {
    size: A4;
    margin: 16mm 14mm 18mm 14mm;
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #64748b;
    }
    @bottom-left {
      content: "SM48 Enterprise Operating System Specification & Commercial Proposal";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #64748b;
      font-weight: 500;
    }
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    font-family: 'Inter', sans-serif;
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.5;
    font-size: 9.1pt;
    margin: 0;
    padding: 0;
  }

  /* Cover Page */
  .cover-page {
    page-break-after: always;
    height: 100%;
    min-height: 960px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 35px 20px 20px 20px;
    background: linear-gradient(135deg, #090e17 0%, #0f172a 50%, #1e1b4b 100%);
    color: #ffffff;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
  }

  .cover-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(129, 140, 248, 0.4);
    padding: 5px 14px;
    border-radius: 9999px;
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #a5b4fc;
    width: fit-content;
  }

  .cover-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 27pt;
    font-weight: 800;
    line-height: 1.15;
    margin: 18px 0 10px 0;
    background: linear-gradient(to right, #ffffff, #e2e8f0, #93c5fd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .cover-subtitle {
    font-size: 11.5pt;
    color: #94a3b8;
    font-weight: 400;
    max-width: 580px;
    line-height: 1.45;
    margin-bottom: 20px;
  }

  .cover-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin: 20px 0;
  }

  .cover-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 14px;
  }

  .cover-card h4 {
    margin: 0 0 5px 0;
    font-size: 9.5pt;
    color: #38bdf8;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .cover-card p {
    margin: 0;
    font-size: 8.2pt;
    color: #cbd5e1;
    line-height: 1.35;
  }

  .cover-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.2pt;
    color: #94a3b8;
  }

  /* Document Body Typography */
  h1 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14.5pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 5px;
    margin-top: 20px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 9px;
    page-break-after: avoid;
  }

  h1 .sec-num {
    background: #4f46e5;
    color: #ffffff;
    font-size: 8.5pt;
    padding: 2.5px 7px;
    border-radius: 5px;
    font-weight: 800;
  }

  h2 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10.8pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 14px;
    margin-bottom: 7px;
    page-break-after: avoid;
    border-left: 3.5px solid #6366f1;
    padding-left: 8px;
  }

  h3 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 9.5pt;
    font-weight: 700;
    color: #334155;
    margin-top: 11px;
    margin-bottom: 5px;
    page-break-after: avoid;
  }

  p {
    margin: 0 0 7px 0;
    color: #334155;
    text-align: justify;
  }

  ul, ol {
    margin: 0 0 9px 0;
    padding-left: 18px;
  }

  li {
    margin-bottom: 3.5px;
    color: #334155;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 8.2pt;
    page-break-inside: avoid;
  }

  th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 7px 9px;
    border: 1px solid #1e293b;
    font-size: 8.2pt;
    letter-spacing: 0.3px;
  }

  td {
    padding: 6px 9px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    color: #334155;
  }

  tr:nth-child(even) td {
    background-color: #f8fafc;
  }

  /* Badges & Pills */
  .badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 7.2pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .badge-purple { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
  .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .badge-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }

  /* Callout Boxes */
  .callout {
    background: #f1f5f9;
    border-left: 4px solid #0ea5e9;
    padding: 9px 12px;
    border-radius: 0 8px 8px 0;
    margin: 10px 0;
    font-size: 8.6pt;
    page-break-inside: avoid;
  }

  .callout-title {
    font-weight: 700;
    color: #0369a1;
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .callout-success {
    background: #f0fdf4;
    border-left-color: #22c55e;
  }
  .callout-success .callout-title { color: #15803d; }

  .callout-warning {
    background: #fffbeb;
    border-left-color: #f59e0b;
  }
  .callout-warning .callout-title { color: #b45309; }

  .callout-danger {
    background: #fef2f2;
    border-left-color: #ef4444;
  }
  .callout-danger .callout-title { color: #b91c1c; }

  /* Grid Layouts */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 10px 0;
    page-break-inside: avoid;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 10px 0;
    page-break-inside: avoid;
  }

  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 9px;
    margin: 10px 0;
    page-break-inside: avoid;
  }

  .feature-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    padding: 9px 11px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .feature-card h4 {
    margin: 0 0 4px 0;
    font-size: 8.8pt;
    font-weight: 700;
    color: #0f172a;
  }

  .feature-card p {
    margin: 0;
    font-size: 7.8pt;
    color: #64748b;
    line-height: 1.35;
  }

  .feature-card ul {
    margin: 0;
    padding-left: 15px;
    font-size: 7.8pt;
    color: #475569;
  }

  /* Code & Pre */
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8pt;
    background: #f1f5f9;
    padding: 1.5px 4.5px;
    border-radius: 4px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  pre {
    background: #0f172a;
    color: #f8fafc;
    padding: 9px 12px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5pt;
    line-height: 1.4;
    overflow-x: auto;
    margin: 9px 0;
  }

  .page-break {
    page-break-before: always;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 4.5px 0;
    border-bottom: 1px dotted #cbd5e1;
    font-size: 8.6pt;
  }

  .toc-item span:first-child {
    font-weight: 600;
    color: #1e293b;
  }

  .toc-item span:last-child {
    font-weight: 700;
    color: #6366f1;
  }

  .pricing-box {
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .pricing-title {
    font-size: 9.5pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .pricing-rate {
    font-size: 13pt;
    font-weight: 800;
    color: #2563eb;
    margin-bottom: 4px;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div>
    <div class="cover-badge">COMMERCIAL SPECIFICATION & PLATFORM PROPOSAL</div>
    <div class="cover-title">SM48<br>ENTERPRISE OPERATING SYSTEM</div>
    <div class="cover-subtitle">
      A powerful, integrated educational operating system featuring online MCQ examinations & student paper marking, real-time teacher-student web chat, smart online attendance, high-velocity CRM campaigns, logistics warehouse dispatch, and the autonomous LUMI AI engine.
    </div>

    <div class="cover-grid">
      <div class="cover-card">
        <h4>Academic & Exam Hub</h4>
        <p>Online timed MCQ examination portal, student written paper uploads, evaluator marking rubrics, and grade publication.</p>
      </div>
      <div class="cover-card">
        <h4>Live Academic Collaboration</h4>
        <p>Direct student-to-teacher web chat, smart attendance tracking, and live timetable orchestration.</p>
      </div>
      <div class="cover-card">
        <h4>Multi-Tenant CRM & Campaigns</h4>
        <p>Omnichannel Meta WhatsApp lead ingestion, 4-tier calling suites, automated quota distribution, and coordinator KPI hubs.</p>
      </div>
      <div class="cover-card">
        <h4>LUMI AI Intelligence Suite</h4>
        <p>Autonomous LUMI Caller voice bot, LUMI Chat assistant, AI marketing image generator, and bilingual call audio analytics.</p>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div><strong>Prepared By:</strong> SM48 Systems & Solutions</div>
    <div><strong>Product Version:</strong> SM48 Enterprise v5.5</div>
    <div><strong>Date:</strong> August 2026</div>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="page-break"></div>
<h1><span class="sec-num">TOC</span> Executive Table of Contents</h1>

<div style="margin-top: 15px;">
  <div class="toc-item"><span>1. Platform Architecture & Multi-Tenant Data Hierarchy</span> <span>Section 01</span></div>
  <div class="toc-item"><span>2. User Hierarchy: Teachers, Students, Staff & Access Control (RBAC)</span> <span>Section 02</span></div>
  <div class="toc-item"><span>3. Online MCQ Examination Engine, Paper Upload & Marking Matrix</span> <span>Section 03</span></div>
  <div class="toc-item"><span>4. Live Student-Teacher Web Chat & Smart Online Attendance</span> <span>Section 04</span></div>
  <div class="toc-item"><span>5. Class Coordination Department (Daily Operations & Timetables)</span> <span>Section 05</span></div>
  <div class="toc-item"><span>6. Free Seminar CRM & Inbound Lead Ingestion Engine</span> <span>Section 06</span></div>
  <div class="toc-item"><span>7. After Seminar CRM & The 4 Call Campaign Suites</span> <span>Section 07</span></div>
  <div class="toc-item"><span>8. Delivery & Warehousing Logistics Department</span> <span>Section 08</span></div>
  <div class="toc-item"><span>9. Finance Management, Ledger Balancing & Revenue Matrix</span> <span>Section 09</span></div>
  <div class="toc-item"><span>10. Technical Operations & Anti-Piracy Video Streaming</span> <span>Section 10</span></div>
  <div class="toc-item"><span>11. LUMI AI Suite & Operational Terms</span> <span>Section 11</span></div>
  <div class="toc-item"><span>12. Student Web Portal & Mobile App Integration Option (100K)</span> <span>Section 12</span></div>
  <div class="toc-item"><span>13. Commercial Pricing, API Tariffs & Marketing Messaging</span> <span>Section 13</span></div>
  <div class="toc-item"><span>14. Technical Support, Bug Fixing SLA & Customization Policy</span> <span>Section 14</span></div>
</div>

<div class="callout callout-success" style="margin-top: 20px;">
  <div class="callout-title">SM48 Solution Scope & Customization Flexibility</div>
  SM48 is delivered as an adaptable enterprise platform. Every workflow, user role, calling tier, and interface module documented in this specification can be customized, tailored, or expanded based on direct mutual discussion and specific institutional requirements.
</div>

<!-- SECTION 1 -->
<h1><span class="sec-num">01</span> Platform Architecture & Multi-Tenant Hierarchy</h1>
<p>
  SM48 is built on an enterprise <strong>Multi-Tenant Relational Architecture</strong> capable of powering multiple educational brands, faculties, and branches on a unified cloud core.
</p>

<h2>1.1 Entity Relationship Hierarchy</h2>
<table>
  <thead>
    <tr>
      <th style="width: 20%;">Entity Level</th>
      <th style="width: 30%;">Database Model</th>
      <th style="width: 50%;">Operational Scope & Functionality</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Business (Tenant)</strong></td>
      <td><code>Business</code> / <code>CrmSettings</code></td>
      <td>Represents an autonomous educational brand or branch. Holds dedicated Meta WhatsApp Cloud API credentials, Gemini AI keys, custom call ringtones, and payment gateway profiles.</td>
    </tr>
    <tr>
      <td><strong>2. Batch (Cohort)</strong></td>
      <td><code>Batch</code> / <code>BatchMonthlyStats</code></td>
      <td>Target academic year or class cohort (e.g., 2026 A/L, 2027 A/L, O/L). Establishes coordinator KPI targets (Individual: 40%, Group: 50%).</td>
    </tr>
    <tr>
      <td><strong>3. Group (Stream)</strong></td>
      <td><code>Group</code></td>
      <td>Academic streams (Physical Science, Biological Science, Commerce, Technology, Arts). Configures bundle discount logic and installment structures.</td>
    </tr>
    <tr>
      <td><strong>4. Course (Subject)</strong></td>
      <td><code>Course</code> / <code>TuteStock</code></td>
      <td>Individual academic courses mapped to lecturers, active months, fee structures, examination modules, and physical warehouse inventory.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 2 -->
<h1><span class="sec-num">02</span> User Hierarchy: Teachers, Students, Staff & Access Control (RBAC)</h1>
<p>
  SM48 enforces zero-trust Role-Based Access Control, providing role-tailored dashboards and permission boundaries across all stakeholders including teachers, students, and administrative staff:
</p>

<table>
  <thead>
    <tr>
      <th>User Role</th>
      <th>Stakeholder Category</th>
      <th>Permissions & System Capabilities</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="badge badge-purple">SYSTEM_ADMIN</span> / <span class="badge badge-purple">SUPER</span></td>
      <td>Executive Administration</td>
      <td>Full unrestricted system access: Database management, CRM configuration, staff management, payment overrides, and <strong>Ghost Mode</strong>.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">HEAD MANAGER</span></td>
      <td>Executive Operations</td>
      <td>Multi-branch oversight, staff KPI monitoring, coordinator management, and financial matrix review.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">TEACHER / LECTURER</span></td>
      <td>Academic Faculty</td>
      <td>Teacher dashboard, course curriculum management, paper marking & evaluation rubric, student web chat, and class timetable visibility.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">CC MANAGER</span></td>
      <td>Class Coordination</td>
      <td>Coordinator performance reviews, lead quota distribution, lecturer tute calendar validation, and roster approvals.</td>
    </tr>
    <tr>
      <td><span class="badge badge-green">COORDINATOR</span></td>
      <td>Class Coordination</td>
      <td>Free Seminar CRM, 4-tier Call Campaigns, Class Timetables, Task Center, Web Inquiries, and Student Data Center.</td>
    </tr>
    <tr>
      <td><span class="badge badge-amber">CALLER</span></td>
      <td>Calling Unit</td>
      <td>Lead execution dialer, disposition updates, feedback logging, and callback scheduling.</td>
    </tr>
    <tr>
      <td><span class="badge badge-amber">DELIVERY STAFF</span></td>
      <td>Delivery & Logistics</td>
      <td>Order packaging, hold issue resolution, waybill printing, courier dispatch, and tute inventory tracking.</td>
    </tr>
    <tr>
      <td><span class="badge badge-green">FINANCE STAFF</span></td>
      <td>Finance & Accounts</td>
      <td>Payment verification, post-pay scheduling, bank statement reconciliation, and financial ledger balancing.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">TECHNICAL STAFF</span></td>
      <td>Technical Operations</td>
      <td>Studio hall allocation, Zoom meeting provisioning, secure anti-piracy video player streaming, and incident logs.</td>
    </tr>
    <tr>
      <td><span class="badge badge-green">STUDENT / USER</span></td>
      <td>End User / Learner</td>
      <td>Live class streaming, MCQ exams, paper uploads, live teacher chat, delivery tracking, and community discussions.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 3 -->
<div class="page-break"></div>
<h1><span class="sec-num">03</span> Online MCQ Examination Engine, Paper Upload & Marking Matrix</h1>
<p>
  SM48 provides a complete digital academic assessment suite, allowing students to take timed examinations, submit written papers, and receive graded rubrics directly through the platform.
</p>

<div class="grid-3">
  <div class="feature-card">
    <h4>1. Timed MCQ Examination Engine</h4>
    <p>Students take timed multiple-choice exams directly in the web portal. Features automated countdown timers, randomized question ordering, instant automated scoring, and detailed answer explanations upon submission.</p>
  </div>
  <div class="feature-card">
    <h4>2. Student Paper Upload Hub</h4>
    <p>For structured essay and written exams, students scan and upload handwritten answer papers as multi-page PDFs or image attachments directly linked to the examination module.</p>
  </div>
  <div class="feature-card">
    <h4>3. Teacher Paper Marking Matrix</h4>
    <p>Teachers and designated paper evaluators access submitted scripts, annotate corrections, input section marks, award final grades, and publish scores directly into the student's digital report card.</p>
  </div>
</div>

<h2>3.1 Examination Lifecycle in SM48</h2>
<pre>
[Teacher Creates Exam] ──> [Timed MCQ Portal / Written Paper Prompt] ──> [Student Submits Online]
                                                                                │
                                              ┌─────────────────────────────────┴─────────────────────────────────┐
                                              ▼                                                                   ▼
                                  [Instant Automated Grading]                                         [Manual Script Evaluation]
                                  [Correct Answers Revealed]                                          [Teacher Marks & Comments]
                                              │                                                                   │
                                              └───────────────────────────────┬───────────────────────────────────┘
                                                                              ▼
                                                              [Report Card & Marks Published]
</pre>

<!-- SECTION 4 -->
<h1><span class="sec-num">04</span> Live Student-Teacher Web Chat & Smart Online Attendance</h1>
<p>
  SM48 bridges real-time communication between students and faculty while automating class attendance tracking across online live lectures.
</p>

<div class="grid-2">
  <div class="feature-card">
    <h4>Live Web Chat with Teachers & Coordinators</h4>
    <ul>
      <li>Direct one-on-one web chat between students, lecturers, and academic coordinators.</li>
      <li>Rich media support (PDF notes, diagrams, voice clips, and past paper snippets).</li>
      <li>Staff and teachers can respond via the CRM workspace with pre-configured Quick Replies.</li>
      <li>Complete historical chat transcript saved to student profile for continuity.</li>
    </ul>
  </div>
  <div class="feature-card">
    <h4>Smart Online Attendance Tracking</h4>
    <ul>
      <li><strong>Live Join Logging:</strong> Automatically registers student join timestamps and total live lecture watch duration.</li>
      <li><strong>Participation Verification:</strong> Confirms live presence during active class hours.</li>
      <li><strong>Attendance Analytics:</strong> Attendance rate reporting per course with automated alerts for irregular attendance.</li>
      <li><strong>Parent Sync:</strong> Generates automated attendance summary reports accessible by academic management.</li>
    </ul>
  </div>
</div>

<!-- SECTION 5 -->
<div class="page-break"></div>
<h1><span class="sec-num">05</span> Class Coordination Department</h1>
<p>
  The Class Coordination Department operates as the daily mission control of the institute, orchestrating timetables, task assignments, rosters, and live student support.
</p>

<h2>5.1 Departmental Modules & Workflows</h2>
<div class="grid-2">
  <div class="feature-card">
    <h4>1. Coordinator Daily KPI Hub</h4>
    <p>Real-time progress bars monitoring daily lead engagement against target benchmarks: Individual Goal (40%) and Group Goal (50%), remaining calling quotas, and active classes scheduled for the day.</p>
  </div>
  <div class="feature-card">
    <h4>2. Class Timetable Engine</h4>
    <p>Comprehensive live schedule manager mapping start/end times, allocated halls, streaming links (Zoom, YouTube, Vimeo), and assigned coordinators with automated pre/in/post-class task generation.</p>
  </div>
  <div class="feature-card">
    <h4>3. Task Center with Proof Validation</h4>
    <p>Template-driven checklists enforcing operational deadlines. Coordinators complete duties by uploading screenshot proof. Overdue tasks lock automatically, requiring manager approval with written reason to unlock.</p>
  </div>
  <div class="feature-card">
    <h4>4. Lecturer Tute Stock Calendar</h4>
    <p>Forecasts printed tute requirements against scheduled lecture dates. Cross-references real-time warehouse inventory to trigger low-stock alerts before classes occur.</p>
  </div>
</div>

<!-- SECTION 6 -->
<h1><span class="sec-num">06</span> Free Seminar CRM & Inbound Lead Ingestion</h1>
<p>
  The Free Seminar CRM captures, qualifies, and converts prospective seminar attendees into fee-paying enrollments.
</p>

<h2>6.1 Key Capabilities</h2>
<ul>
  <li><strong>Meta WhatsApp Cloud API Webhook:</strong> Real-time inbound lead ingestion across multiple WhatsApp Business numbers.</li>
  <li><strong>Auto Assign Quota Engine:</strong> Fair round-robin distribution bounded by daily coordinator capacity limits.</li>
  <li><strong>WebRTC WhatsApp Voice Calling:</strong> In-browser calling directly to student WhatsApp numbers with interactive template permissions.</li>
  <li><strong>Bilingual Call Transcription:</strong> Automatically transcribes voice recordings and analyzes sentiment (Mood, Summary, Vibe Score).</li>
</ul>

<!-- SECTION 7 -->
<div class="page-break"></div>
<h1><span class="sec-num">07</span> After Seminar CRM & The 4 Call Campaign Suites</h1>
<p>
  Following promotional seminars, leads transition into the specialized <strong>4-Tier Call Campaign Suite</strong> to maximize enrollment conversion and reduce student churn.
</p>

<table>
  <thead>
    <tr>
      <th style="width: 25%;">Campaign Tier</th>
      <th style="width: 35%;">Target Audience</th>
      <th style="width: 40%;">Operational Logic & Progression</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Open Seminar Leads</strong></td>
      <td>Students who attended or registered for promotional seminars.</td>
      <td>
        Multi-round progression (Round 1 &rarr; Round 2 &rarr; Round 3). Tracks disposition codes (Answered, Busy, Switched Off, Thinking) and calculates delay penalties (<code>r1DelayedDays</code>) if follow-ups exceed SLA.
      </td>
    </tr>
    <tr>
      <td><strong>2. New Inquiries</strong></td>
      <td>Hot inbound leads from digital marketing and website inquiry forms.</td>
      <td>
        Enforces a high-urgency SLA countdown timer. Requires rapid first-call resolution and follow-up callback scheduling.
      </td>
    </tr>
    <tr>
      <td><strong>3. Bridge Transfers</strong></td>
      <td>Leads transferred between academic departments or sister institute brands.</td>
      <td>
        Displays complete previous call notes and transfer justification for seamless context-aware re-engagement.
      </td>
    </tr>
    <tr>
      <td><strong>4. Paid Students (Retention)</strong></td>
      <td>Enrolled students on installment plans or with dropped payment history.</td>
      <td>
        Tracks installment due dates (Installments 1, 2, 3), post-pay grace periods, recovers dropped students, and promotes subject bundle upgrades.
      </td>
    </tr>
  </tbody>
</table>

<!-- SECTION 8 -->
<h1><span class="sec-num">08</span> Delivery & Warehousing Logistics Department</h1>
<p>
  Manages physical printed tute distribution from payment approval through courier waybill generation to final doorstep delivery.
</p>

<h2>8.1 Delivery Hub Pipeline Tabs</h2>
<table>
  <thead>
    <tr>
      <th style="width: 25%;">Dashboard Tab</th>
      <th style="width: 75%;">Functional Operations</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Overview</strong></td>
      <td>Executive summary metrics showing orders packed today, pending dispatches, active delivery holds, and completed shipments.</td>
    </tr>
    <tr>
      <td><strong>2. Pending & Holds</strong></td>
      <td>Isolates orders stalled by incorrect phone numbers, ambiguous addresses, or stock shortages. Features a coordinator collaboration loop to fix and auto-release held orders.</td>
    </tr>
    <tr>
      <td><strong>3. Delivered / Dispatched</strong></td>
      <td>Tracks shipped parcels with live courier tracking numbers, bulk waybill printing, and delivery date stamping.</td>
    </tr>
    <tr>
      <td><strong>4. Delivery History</strong></td>
      <td>Complete search archive with instant indexing by student name, telephone number, payment ID, or courier tracking code.</td>
    </tr>
    <tr>
      <td><strong>5. Tute Stock & Reports</strong></td>
      <td>Live warehouse inventory balance, minimum threshold alerts, auto-deduction upon packing, and historical audit logs.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 9 -->
<div class="page-break"></div>
<h1><span class="sec-num">09</span> Finance Management, Ledger Balancing & Revenue Matrix</h1>
<p>
  Manages student billing, payment verification, installment schedules, excess/arrears ledger balancing, and bank statement reconciliations.
</p>

<div class="grid-2">
  <div class="feature-card">
    <h4>Payment Verification Hub</h4>
    <p>Manual review and approval pipeline for student payment receipts supporting Full Payments, Monthly Subscriptions, 3-Tier Installment Plans, and Post-Pay grace periods.</p>
  </div>
  <div class="feature-card">
    <h4>Ledger Balancing (Excess & Arrears)</h4>
    <p>Automatically records student overpayments or underpayments onto their digital ledger, adjusting next month's fee liability accordingly.</p>
  </div>
  <div class="feature-card">
    <h4>Bank Statement Reconciliation</h4>
    <p>Imports bank statement CSV feeds to automatically cross-match student claimed payments against verified bank ledger deposits.</p>
  </div>
  <div class="feature-card">
    <h4>Upgrade Pricing Matrix</h4>
    <p>Calculates exact pro-rated price differentials when students upgrade from single subjects to multi-subject combo bundles.</p>
  </div>
</div>

<!-- SECTION 10 -->
<h1><span class="sec-num">10</span> Technical Operations & Anti-Piracy Video Streaming</h1>
<p>
  Coordinates live broadcast infrastructure, studio hall allocations, Zoom account rotation, and anti-piracy video delivery.
</p>

<h2>10.1 Anti-Piracy Watermarked Video Player</h2>
<p>
  Live streams and recorded lectures are rendered through a proprietary encrypted player with a dynamic floating watermarking layer. The student's full name, telephone number, and IP address animate across the screen at randomized intervals, deterring unauthorized screen recording.
</p>

<h2>10.2 Zoom Multi-Account Provisioning</h2>
<p>
  Maintains a pool of Zoom OAuth API accounts, automatically provisioning live class meetings, managing concurrent attendee limits, and injecting live access links directly into student dashboards.
</p>

<!-- SECTION 11 -->
<div class="page-break"></div>
<h1><span class="sec-num">11</span> LUMI AI Suite & Operational Terms</h1>
<p>
  The LUMI AI Suite embeds advanced artificial intelligence across academic, customer service, and marketing workflows.
</p>

<div class="grid-4">
  <div class="feature-card">
    <h4>1. LUMI Chat</h4>
    <p>24/7 intelligent conversational chatbot responding instantly to student inquiries with institute knowledge base grounding.</p>
  </div>
  <div class="feature-card">
    <h4>2. LUMI Caller</h4>
    <p>Autonomous AI voice bot making natural outbound seminar reminder and follow-up calls in English & Sinhala.</p>
  </div>
  <div class="feature-card">
    <h4>3. LUMI Image Studio</h4>
    <p>Generative marketing engine crafting high-resolution promotional banners and graphic assets on demand.</p>
  </div>
  <div class="feature-card">
    <h4>4. AI Call Audio Analytics</h4>
    <p>Speech-to-text transcription engine that records, transcribes, and calculates sentiment/vibe scores for coordinator calls.</p>
  </div>
</div>

<div class="callout callout-warning" style="margin-top: 15px;">
  <div class="callout-title">Operational Terms & API Cost Policy for LUMI AI</div>
  All LUMI AI capabilities connect directly to foundational LLM and speech inference APIs. <strong>Direct third-party AI API token and computation expenses (e.g., Google Cloud / OpenAI / Anthropic consumption) are borne directly by the purchasing company/client</strong> based on actual institutional usage volume.
</div>

<!-- SECTION 12 -->
<h1><span class="sec-num">12</span> Student Web Portal & Mobile App Integration Option</h1>

<h2>12.1 Student Web Portal Features</h2>
<ul>
  <li><strong>Student Dashboard V2:</strong> Modern web portal highlighting today's scheduled classes, live lecture join links, online MCQ assessments, and campus announcements.</li>
  <li><strong>Delivery Tracking Hub:</strong> Live multi-stage parcel progress tracker (Order Approved &rarr; Packed &rarr; Dispatched &rarr; Out for Delivery).</li>
  <li><strong>Paycorp Payment Gateway:</strong> Multi-channel digital fee collection supporting Credit/Debit Cards, QR payments, and manual slip uploads.</li>
  <li><strong>Moderated Student Community Chat:</strong> Dedicated batch-level discussions featuring automated AI content moderation that removes inappropriate language in real time.</li>
</ul>

<h2>12.2 Mobile Application Add-On Package (LKR 100,000/-)</h2>
<div class="callout callout-success">
  <div class="callout-title">Native Mobile App Development Option (iOS & Android) — LKR 100K</div>
  SM48 is natively delivered as a 100% responsive Progressive Web Platform. If your institute requires a <strong>dedicated Native Mobile Application published on Google Play Store and Apple App Store</strong>, our engineering team will build, brand, and deploy the mobile app for a fixed add-on investment of <strong>LKR 100,000/- (100K)</strong>. All backend endpoints and WebSocket pipelines are already 100% mobile-ready.
</div>

<!-- SECTION 13 -->
<div class="page-break"></div>
<h1><span class="sec-num">13</span> Commercial Pricing, API Tariffs & Marketing Messaging</h1>
<p>
  The following official pricing and tariff schedules apply to platform channels, telephony, and communication gateways:
</p>

<div class="pricing-box">
  <div class="pricing-title">1. Meta WhatsApp Cloud API Channel & Marketing Messages</div>
  <div class="pricing-rate">LKR 7,500/- <span style="font-size: 8.5pt; color: #64748b; font-weight: 500;">per Meta API Account / Month</span></div>
  <p style="margin: 0 0 6px 0; font-size: 8.3pt; color: #334155;">
    Includes unlimited inbound WhatsApp messaging throughput, CRM chat workspace, auto-reply sequence execution, and customer service conversations.
  </p>
  <div style="background: #e2e8f0; padding: 6px 10px; border-radius: 6px; font-size: 8.2pt; color: #0f172a; font-weight: 600;">
    📢 Meta Outbound Marketing Template Messages: <span style="color: #2563eb; font-weight: 800;">LKR 25.00</span> per delivered marketing template message (standard Meta API tariff).
  </div>
</div>

<div class="pricing-box">
  <div class="pricing-title">2. CRM WhatsApp Voice Caller & Custom SIP Trunk Telephony</div>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 6px 0 10px 0;">
    <div>
      <div style="font-size: 7.8pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Fixed Line Rental</div>
      <div style="font-size: 11pt; font-weight: 800; color: #0f172a;">LKR 2,500/-</div>
      <div style="font-size: 7.5pt; color: #64748b;">Per Meta API Number / Month</div>
    </div>
    <div>
      <div style="font-size: 7.8pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Inbound Calls</div>
      <div style="font-size: 11pt; font-weight: 800; color: #16a34a;">FREE (LKR 0/-)</div>
      <div style="font-size: 7.5pt; color: #64748b;">Unlimited Inbound Duration</div>
    </div>
    <div>
      <div style="font-size: 7.8pt; color: #64748b; font-weight: 700; text-transform: uppercase;">Outbound Calls</div>
      <div style="font-size: 11pt; font-weight: 800; color: #dc2626;">LKR 5.00 / min</div>
      <div style="font-size: 7.5pt; color: #64748b;">Per Active Outbound Minute</div>
    </div>
  </div>
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 10px; border-radius: 6px; font-size: 8.2pt; color: #15803d; font-weight: 600;">
    📞 <strong>Custom Normal Voice SIP Trunk Integration:</strong> If your company/institute already possesses or purchases a standard voice SIP Trunk line (e.g. SLT / Dialog / Mobitel SIP), our team will configure and integrate it with the CRM dialer with <strong>ZERO integration fees</strong>.
  </div>
</div>

<div class="pricing-box">
  <div class="pricing-title">3. Native Mobile Application Add-On (iOS & Android)</div>
  <div class="pricing-rate">LKR 100,000/- <span style="font-size: 8.5pt; color: #64748b; font-weight: 500;">One-Time Development & Store Publishing Package</span></div>
</div>

<!-- SECTION 14 -->
<h1><span class="sec-num">14</span> Technical Support, Bug Fixing SLA & Customization Policy</h1>

<h2>14.1 Continuous Technical Support & Maintenance SLA</h2>
<p>
  We provide full after-sales technical maintenance and operational surveillance:
</p>
<div class="grid-2">
  <div class="feature-card">
    <h4>Bug & Error Resolution</h4>
    <p>Proactive bug fixing, glitch patching, database query optimization, and performance index tuning included in support coverage.</p>
  </div>
  <div class="feature-card">
    <h4>24/7 System Health Monitoring</h4>
    <p>Continuous surveillance of WebSocket bridges, Meta webhooks, server memory load, and database response times.</p>
  </div>
</div>

<h2>14.2 Future Customization & Extended Development Policy</h2>
<div class="callout callout-success">
  <div class="callout-title">Bespoke Customization & Future Development Pricing</div>
  All features and modules documented in this specification can be customized to your requirements. <strong>Any additional custom development, new departmental modules, or proprietary third-party integrations beyond the scope of this specification will be quoted and delivered upon direct mutual discussion and agreement</strong>.
</div>

</body>
</html>
  `;

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const rootPdfPath = path.join('/root/IMA-Campus', 'SM48_Master_System_Specification.pdf');
  const backendPublicPdfPath = path.join('/root/IMA-Campus/backend/public', 'SM48_Master_System_Specification.pdf');
  const frontendPublicPdfPath = path.join('/root/IMA-Campus/frontend/public', 'SM48_Master_System_Specification.pdf');

  // Ensure public dirs exist
  if (!fs.existsSync(path.dirname(backendPublicPdfPath))) {
    fs.mkdirSync(path.dirname(backendPublicPdfPath), { recursive: true });
  }
  if (!fs.existsSync(path.dirname(frontendPublicPdfPath))) {
    fs.mkdirSync(path.dirname(frontendPublicPdfPath), { recursive: true });
  }

  await page.pdf({
    path: rootPdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '16mm',
      bottom: '18mm',
      left: '14mm',
      right: '14mm'
    }
  });

  // Copy to public paths
  fs.copyFileSync(rootPdfPath, backendPublicPdfPath);
  fs.copyFileSync(rootPdfPath, frontendPublicPdfPath);

  console.log(`SM48 Master PDF (Refined) successfully generated at:\n- ${rootPdfPath}\n- ${backendPublicPdfPath}\n- ${frontendPublicPdfPath}`);

  await browser.close();
}

generateSM48PDF().catch(err => {
  console.error("Error generating refined SM48 PDF:", err);
  process.exit(1);
});
