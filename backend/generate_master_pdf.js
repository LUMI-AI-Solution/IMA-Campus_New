const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF() {
  console.log("Starting Master System Specification PDF generation...");

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>IMA CAMPUS — Master System Specification & Comprehensive Service Directory</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

  @page {
    size: A4;
    margin: 18mm 14mm 20mm 14mm;
    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #64748b;
    }
    @bottom-left {
      content: "IMA Campus Enterprise System Specification";
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
    line-height: 1.55;
    font-size: 9.5pt;
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
    padding: 40px 20px 20px 20px;
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
    padding: 6px 16px;
    border-radius: 9999px;
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #a5b4fc;
    width: fit-content;
  }

  .cover-title {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 28pt;
    font-weight: 800;
    line-height: 1.15;
    margin: 20px 0 10px 0;
    background: linear-gradient(to right, #ffffff, #e2e8f0, #93c5fd);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .cover-subtitle {
    font-size: 12pt;
    color: #94a3b8;
    font-weight: 400;
    max-width: 580px;
    line-height: 1.5;
    margin-bottom: 25px;
  }

  .cover-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin: 25px 0;
  }

  .cover-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 16px;
  }

  .cover-card h4 {
    margin: 0 0 6px 0;
    font-size: 10pt;
    color: #38bdf8;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .cover-card p {
    margin: 0;
    font-size: 8.5pt;
    color: #cbd5e1;
    line-height: 1.4;
  }

  .cover-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5pt;
    color: #94a3b8;
  }

  /* Document Body Typography */
  h1 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 16pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 26px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    page-break-after: avoid;
  }

  h1 .sec-num {
    background: #4f46e5;
    color: #ffffff;
    font-size: 9.5pt;
    padding: 3px 8px;
    border-radius: 6px;
    font-weight: 800;
  }

  h2 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 16px;
    margin-bottom: 8px;
    page-break-after: avoid;
    border-left: 3.5px solid #6366f1;
    padding-left: 8px;
  }

  h3 {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 10pt;
    font-weight: 700;
    color: #334155;
    margin-top: 12px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }

  p {
    margin: 0 0 8px 0;
    color: #334155;
    text-align: justify;
  }

  ul, ol {
    margin: 0 0 10px 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 4px;
    color: #334155;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }

  th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #1e293b;
    font-size: 8.5pt;
    letter-spacing: 0.3px;
  }

  td {
    padding: 7px 10px;
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
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 7.5pt;
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
    padding: 10px 14px;
    border-radius: 0 8px 8px 0;
    margin: 12px 0;
    font-size: 9pt;
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
    gap: 12px;
    margin: 12px 0;
    page-break-inside: avoid;
  }

  .grid-4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 12px 0;
    page-break-inside: avoid;
  }

  .feature-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .feature-card h4 {
    margin: 0 0 4px 0;
    font-size: 9pt;
    font-weight: 700;
    color: #0f172a;
  }

  .feature-card p {
    margin: 0;
    font-size: 8pt;
    color: #64748b;
    line-height: 1.4;
  }

  .feature-card ul {
    margin: 0;
    padding-left: 16px;
    font-size: 8pt;
    color: #475569;
  }

  /* Code & Pre */
  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    background: #f1f5f9;
    padding: 2px 5px;
    border-radius: 4px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  pre {
    background: #0f172a;
    color: #f8fafc;
    padding: 10px 14px;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8pt;
    line-height: 1.45;
    overflow-x: auto;
    margin: 10px 0;
  }

  .page-break {
    page-break-before: always;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px dotted #cbd5e1;
    font-size: 9pt;
  }

  .toc-item span:first-child {
    font-weight: 600;
    color: #1e293b;
  }

  .toc-item span:last-child {
    font-weight: 700;
    color: #6366f1;
  }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div>
    <div class="cover-badge">ENTERPRISE SYSTEM ARCHITECTURE</div>
    <div class="cover-title">IMA CAMPUS<br>MASTER SYSTEM SPECIFICATION</div>
    <div class="cover-subtitle">
      A comprehensive technical manual, departmental workflow guide, and complete service directory detailing all capabilities, modules, and operational logic.
    </div>

    <div class="cover-grid">
      <div class="cover-card">
        <h4>Multi-Tenant Core</h4>
        <p>Unified enterprise engine managing multiple institutes, batches, courses, faculty, and cross-business logistics.</p>
      </div>
      <div class="cover-card">
        <h4>LUMI AI Intelligence</h4>
        <p>Autonomous voice agent, automated receipt verification OCR, live analytics, and generative marketing studios.</p>
      </div>
      <div class="cover-card">
        <h4>4-Tier Campaign Hub</h4>
        <p>Advanced lifecycle CRM managing Open Seminar, Inbound Inquiries, Bridge Transfers, and Retention funnels.</p>
      </div>
      <div class="cover-card">
        <h4>Supply Chain Logistics</h4>
        <p>End-to-end tute warehouse management, hold resolution workflows, and integrated courier tracking pipelines.</p>
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div><strong>Prepared For:</strong> Executive Management & Engineering Teams</div>
    <div><strong>Version:</strong> 4.5 Enterprise Edition</div>
    <div><strong>Date:</strong> August 2026</div>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="page-break"></div>
<h1><span class="sec-num">TOC</span> Executive Table of Contents</h1>

<div style="margin-top: 20px;">
  <div class="toc-item"><span>1. System Architecture & Multi-Tenant Data Hierarchy</span> <span>Section 01</span></div>
  <div class="toc-item"><span>2. User Roles, Permissions & Access Control Matrix</span> <span>Section 02</span></div>
  <div class="toc-item"><span>3. Class Coordination Department (Core Operations Manual)</span> <span>Section 03</span></div>
  <div class="toc-item"><span>4. Free Seminar CRM & Autonomous Ingestion Engine</span> <span>Section 04</span></div>
  <div class="toc-item"><span>5. After Seminar CRM & The 4 Call Campaign Suites</span> <span>Section 05</span></div>
  <div class="toc-item"><span>6. Call Center Department (Inbound/Outbound Routing Hub)</span> <span>Section 06</span></div>
  <div class="toc-item"><span>7. Social Media Department & AI Creative Studio</span> <span>Section 07</span></div>
  <div class="toc-item"><span>8. Delivery Department (Warehousing & Logistics Fulfillment)</span> <span>Section 08</span></div>
  <div class="toc-item"><span>9. Finance Department, AI Slip Verification & Payment Matrix</span> <span>Section 09</span></div>
  <div class="toc-item"><span>10. Physical Institute CRM (Campus RFID & Cashier Hub)</span> <span>Section 10</span></div>
  <div class="toc-item"><span>11. Technical Department & Secure Streaming Infrastructure</span> <span>Section 11</span></div>
  <div class="toc-item"><span>12. LUMI AI Suite (Autonomous Multi-Modal AI Engines)</span> <span>Section 12</span></div>
  <div class="toc-item"><span>13. Student Portal & Mobile App Ecosystem</span> <span>Section 13</span></div>
  <div class="toc-item"><span>14. System Administration, Audit Trails & Global Utilities</span> <span>Section 14</span></div>
</div>

<div class="callout callout-success" style="margin-top: 25px;">
  <div class="callout-title">Document Scope & Confidentiality Notice</div>
  This specification serves as the definitive reference document for all technical workflows, data models, user interface states, and operational procedures implemented within the IMA Campus web and mobile ecosystems.
</div>

<!-- SECTION 1 -->
<h1><span class="sec-num">01</span> System Architecture & Multi-Tenant Hierarchy</h1>
<p>
  IMA Campus operates on an enterprise-grade <strong>Multi-Tenant Relational Architecture</strong> built to scale across multiple educational institutes, diverse academic disciplines, and hundreds of thousands of concurrent students.
</p>

<h2>1.1 Data Model Entity Relationship</h2>
<table>
  <thead>
    <tr>
      <th style="width: 20%;">Entity Level</th>
      <th style="width: 30%;">Database Schema Model</th>
      <th style="width: 50%;">Operational Purpose & Functionality</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Business (Tenant)</strong></td>
      <td><code>Business</code> / <code>CrmSettings</code></td>
      <td>Represents an autonomous educational brand/institute. Owns isolated Meta WhatsApp Cloud API credentials, Gemini AI API keys, payment merchant IDs, custom call ringtones, and default medium rules.</td>
    </tr>
    <tr>
      <td><strong>2. Batch (Cohort)</strong></td>
      <td><code>Batch</code> / <code>BatchMonthlyStats</code></td>
      <td>Represents an academic year or target examination cohort (e.g., 2026 A/L, 2027 A/L). Sets coordinator KPI benchmarks: Individual Goal (40%) and Group Goal (50%).</td>
    </tr>
    <tr>
      <td><strong>3. Group (Stream)</strong></td>
      <td><code>Group</code></td>
      <td>Academic subject streams (e.g., Physical Science, Biological Science, Commerce, Technology, Arts). Houses bundle discount matrices and installment rules.</td>
    </tr>
    <tr>
      <td><strong>4. Course (Subject)</strong></td>
      <td><code>Course</code> / <code>TuteStock</code></td>
      <td>Individual subjects mapped to specific lecturers, monthly fee schedules, bundle exclusions, active academic lifespans, and physical warehouse inventory.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 2 -->
<h1><span class="sec-num">02</span> User Roles & Role-Based Access Control (RBAC)</h1>
<p>
  The system enforces strict zero-trust Role-Based Access Control (RBAC), providing customized dashboards, dedicated navigation bars, and granular data access according to user roles and departmental affiliations.
</p>

<table>
  <thead>
    <tr>
      <th>User Role</th>
      <th>Department Mapping</th>
      <th>Permissions & System Capabilities</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><span class="badge badge-purple">SYSTEM_ADMIN</span> / <span class="badge badge-purple">SUPER</span></td>
      <td>Executive Administration</td>
      <td>Unrestricted full-system access: CRM configuration, database manager, test injector, staff profile modifications, payment overrides, and <strong>Ghost Mode</strong>.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">HEAD MANAGER</span></td>
      <td>Executive Operations</td>
      <td>Multi-branch oversight, staff KPI appraisals, social media delegation approval, and executive finance matrix inspection.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">CC MANAGER</span></td>
      <td>Class Coordination</td>
      <td>Coordinator performance monitoring, quota distribution, lecturer tute calendar verification, and roster approval.</td>
    </tr>
    <tr>
      <td><span class="badge badge-green">COORDINATOR</span></td>
      <td>Class Coordination</td>
      <td>Free Seminar CRM, 4-tier Call Campaigns, Class Timetable, Task Center, Monthly Roster, Web Inquiries, and Student Data Center.</td>
    </tr>
    <tr>
      <td><span class="badge badge-amber">CALLER</span></td>
      <td>Calling Unit</td>
      <td>Lead execution dialer, disposition recording, feedback entry, and call attempts logging.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">CALL CENTER MGR</span></td>
      <td>Call Center</td>
      <td>Agent workload balancing, real-time call volume analytics, break time tracking, and bridge transfer approvals.</td>
    </tr>
    <tr>
      <td><span class="badge badge-amber">CALL CENTER AGENT</span></td>
      <td>Call Center</td>
      <td>Dedicated call center dialer workspace, agent status switcher (Online, Lunch, Away), and fast lead escalation.</td>
    </tr>
    <tr>
      <td><span class="badge badge-purple">SOCIAL MEDIA MGR</span></td>
      <td>Social Media</td>
      <td>Marketing job card review, task allocation to designers/editors, content calendar planning, and AI creative tools.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">SOCIAL MEDIA STAFF</span></td>
      <td>Social Media</td>
      <td>Assigned graphic/video design execution, submitting proof assets, version revisions, and AI subtitle video editing.</td>
    </tr>
    <tr>
      <td><span class="badge badge-amber">DELIVERY STAFF</span></td>
      <td>Delivery & Logistics</td>
      <td>Order packaging, hold issue resolution, waybill generation, courier dispatch, and warehouse tute stock tracking.</td>
    </tr>
    <tr>
      <td><span class="badge badge-green">FINANCE STAFF</span></td>
      <td>Finance & Accounts</td>
      <td>Manual & AI receipt verification, post-pay scheduling, bank statement reconciliation, and payment dispute handling.</td>
    </tr>
    <tr>
      <td><span class="badge badge-red">PHYSICAL MGR</span></td>
      <td>Physical Branches</td>
      <td>RFID card issuance, smart student attendance, lecturer revenue shares, hall scheduling, and branch petty cash ledgers.</td>
    </tr>
    <tr>
      <td><span class="badge badge-blue">TECHNICAL STAFF</span></td>
      <td>Technical Operations</td>
      <td>Studio hall allocation, Zoom API credentials rotation, secure anti-piracy watermarked player streaming, and incident logs.</td>
    </tr>
    <tr>
      <td><span class="badge badge-green">STUDENT</span></td>
      <td>Public Student Portal</td>
      <td>V2 Dashboard, live watermarked video player, delivery tracking timeline, Paycorp gateway, and moderated app community chat.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 3 -->
<div class="page-break"></div>
<h1><span class="sec-num">03</span> Class Coordination Department</h1>
<p>
  The Class Coordination Department serves as the operational backbone of IMA Campus. It bridges student inquiries, faculty scheduling, tute delivery schedules, daily task tracking, and lead conversions.
</p>

<h2>3.1 Core Modules & Daily Coordinator Workflows</h2>

<div class="grid-2">
  <div class="feature-card">
    <h4>1. Coordinator Daily Hub & KPI Matrix</h4>
    <p>Live trackers displaying the coordinator's daily target progress against Individual Goals (40%) and Group Goals (50%), remaining daily calling quotas, pending task tallies, and active classes scheduled for the day.</p>
  </div>
  <div class="feature-card">
    <h4>2. Class Timetable Engine</h4>
    <p>Full scheduling interface for live classes with start/end times, assigned hall, streaming links (Zoom, YouTube, Vimeo), assigned coordinator, and automated generation of pre/in/post class checklists.</p>
  </div>
  <div class="feature-card">
    <h4>3. Template-Driven Task Center</h4>
    <p>Custom and automated recurring tasks with deadline enforcement. Coordinators complete duties by uploading screenshot proof. Overdue tasks are locked and require manager approval with written justification to unlock.</p>
  </div>
  <div class="feature-card">
    <h4>4. Lecturer Tute Stock Calendar</h4>
    <p>Compares scheduled class dates against current warehouse inventory. Automatically warns coordinators when physical stock falls below enrolled student counts prior to a lecture.</p>
  </div>
</div>

<div class="grid-2">
  <div class="feature-card">
    <h4>5. Monthly Staff Roster</h4>
    <p>Structured duty schedule covering Normal Duty, Half Day, Day Off, and Poya Day shifts. Integrates daily manual call logs to measure individual team productivity.</p>
  </div>
  <div class="feature-card">
    <h4>6. Web Inquiries (LUMI Live Chat)</h4>
    <p>Real-time omnichannel student support interface. Inquiries from the website and portal are auto-routed to coordinators with instant chat, quick replies, and file attachments.</p>
  </div>
</div>

<!-- SECTION 4 -->
<h1><span class="sec-num">04</span> Free Seminar CRM & Lead Ingestion</h1>
<p>
  The Free Seminar CRM captures, qualifies, and nurtures prospective students who register for free promotional seminars, converting them into active, fee-paying enrollments.
</p>

<h2>4.1 Autonomous Ingestion & Lead Distribution</h2>
<ul>
  <li><strong>Meta Cloud API Integration:</strong> Direct webhook synchronization across multiple WhatsApp Business numbers. Messages instantly create leads with complete conversational metadata.</li>
  <li><strong>Bulk CSV/Excel Ingestion:</strong> Ingests external marketing campaign data with automatic phone number normalization and deduplication safeguards.</li>
  <li><strong>Auto Assign Quota Engine:</strong> Dynamically distributes incoming leads among on-duty coordinators using fair round-robin allocation bounded by configurable daily manager quotas.</li>
</ul>

<h2>4.2 WebRTC WhatsApp Voice Calling & Headless IVR</h2>
<p>
  Coordinators initiate direct WhatsApp voice calls to prospective students straight from the browser using custom SIP/WebRTC bridges.
</p>
<div class="callout callout-warning">
  <div class="callout-title">Interactive Permission & AI Audio Processing</div>
  Before outbound calls are triggered, an interactive WhatsApp template with Accept/Decline action buttons is dispatched. Upon call termination, the recording is transcribed into English and Sinhala, followed by Gemini AI sentiment analysis to output Mood, Summary, and Vibe Scores.
</div>

<!-- SECTION 5 -->
<div class="page-break"></div>
<h1><span class="sec-num">05</span> After Seminar CRM & The 4 Call Campaigns</h1>
<p>
  Following a seminar, leads transition into the <strong>4-Tier Call Campaign Suite</strong>, an advanced pipeline designed to drive course enrollments, prevent student dropouts, and manage overdue fee collections.
</p>

<h2>5.1 Comprehensive Breakdown of the 4 Campaign Tiers</h2>

<table>
  <thead>
    <tr>
      <th style="width: 25%;">Campaign Tier</th>
      <th style="width: 35%;">Target Audience & Ingestion Source</th>
      <th style="width: 40%;">Operational Logic & Progression Rules</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Open Seminar Leads</strong></td>
      <td>Students who registered for or attended free promotional seminars.</td>
      <td>
        Multi-round calling (R1 &rarr; R2 &rarr; R3). Tracks calling attempts, contact statuses (Answered, Busy, Switched Off, Thinking), and auto-calculates delay penalties (<code>r1DelayedDays</code>) if follow-ups exceed SLA limits.
      </td>
    </tr>
    <tr>
      <td><strong>2. New Inquiries</strong></td>
      <td>Direct inbound hot leads from web forms, WhatsApp, and digital ads.</td>
      <td>
        Enforces a high-urgency SLA countdown timer. Requires immediate first-call resolution and scheduling of follow-up callbacks.
      </td>
    </tr>
    <tr>
      <td><strong>3. Bridge Transfers</strong></td>
      <td>Leads transferred from Call Center agents or cross-business brands.</td>
      <td>
        Displays complete previous conversation notes and transfer reasons, facilitating seamless context-aware re-engagement.
      </td>
    </tr>
    <tr>
      <td><strong>4. Paid Students (Retention)</strong></td>
      <td>Enrolled students with installment plans or dropped payment history.</td>
      <td>
        Tracks installment schedules (Installments 1, 2, 3), post-pay grace periods, recovers dropped students, and drives upgrades from single subjects to full bundles.
      </td>
    </tr>
  </tbody>
</table>

<h2>5.2 Campaign Audit Trail & Status State Machine</h2>
<p>
  Every lead status update, call attempt, and coordinator note is permanently immutably logged into <code>CallCampaignAuditLog</code>, ensuring complete transparency and accountability across teams.
</p>

<!-- SECTION 6 -->
<h1><span class="sec-num">06</span> Call Center Department</h1>
<p>
  The Call Center Department acts as a centralized high-velocity calling engine, filtering massive volumes of raw leads and escalating qualified prospective students to class coordinators.
</p>

<div class="grid-2">
  <div class="feature-card">
    <h4>Call Center Manager Hub</h4>
    <ul>
      <li>Live monitoring of inbound and outbound call traffic.</li>
      <li>Real-time agent state oversight (Active, In-Call, Lunch, Away).</li>
      <li>Dynamic lead pool rebalancing and bulk reassignment.</li>
      <li>Approval pipeline for bridge transfer requests to coordinators.</li>
    </ul>
  </div>
  <div class="feature-card">
    <h4>Call Center Agent Workspace</h4>
    <ul>
      <li>High-speed one-click softphone dialer.</li>
      <li>Immediate disposition selection with standardized notes.</li>
      <li>Instant escalation: Single-click Bridge Handover to Class Coordination.</li>
      <li>Agent performance scorecard tracking daily completed calls.</li>
    </ul>
  </div>
</div>

<!-- SECTION 7 -->
<div class="page-break"></div>
<h1><span class="sec-num">07</span> Social Media Department & AI Creative Studio</h1>
<p>
  The Social Media Department centralizes marketing requests, creative asset production, content calendar scheduling, and AI-powered multimedia generation across all campus brands.
</p>

<h2>7.1 Social Media Delegation Hub (Digital Job Cards)</h2>
<p>
  Class coordinators and branch managers request promotional banners, video flyers, and reel scripts through structured <strong>Digital Job Cards</strong> with strict milestone auditing.
</p>

<pre>
[Job Requested] ──> [Assigned] ──> [In Progress] ──> [Proof Submitted] ──> [Approved / Completed]
                                                            │
                                                            └──> [Correction Requested] ──> [Revised]
</pre>

<h2>7.2 AI Creative Studio Tool Suite</h2>
<table>
  <thead>
    <tr>
      <th>Tool Name</th>
      <th>Technology Engine</th>
      <th>Capabilities & Output Deliverables</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>AI Video Generator</strong></td>
      <td>Generative Scripting + AI TTS</td>
      <td>Generates complete promotional shorts/reels with synchronized voiceovers, background footage, and kinetic text from a text prompt.</td>
    </tr>
    <tr>
      <td><strong>AI Reel Music Matcher</strong></td>
      <td>Audio Vibe & Trend Classifier</td>
      <td>Analyzes video theme and pacing to recommend top trending audio tracks for TikTok and Instagram algorithms.</td>
    </tr>
    <tr>
      <td><strong>AI Subtitle Video Editor</strong></td>
      <td>Speech Recognition + Auto-SRT</td>
      <td>Transcribes video dialogue and burns in stylized, animated, high-engagement subtitles (CapCut-style formatting).</td>
    </tr>
    <tr>
      <td><strong>LUMI Image Generator</strong></td>
      <td>High-Resolution Image Models</td>
      <td>Creates custom marketing graphics, subject artwork, and promotional backdrops on demand.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 8 -->
<h1><span class="sec-num">08</span> Delivery Department (Warehousing & Logistics)</h1>
<p>
  The Delivery Department manages physical printed tute distribution from payment approval through courier waybill generation to final doorstep delivery.
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
<h1><span class="sec-num">09</span> Finance Department & Payment Management</h1>
<p>
  The Finance Department oversees student billing, payment verification, installment schedules, anti-fraud slip checks, and bank statement reconciliations.
</p>

<h2>9.1 LUMI AI Slip Verification & Anti-Fraud Engine</h2>
<p>
  Uploaded payment slips are immediately analyzed by Gemini Vision AI to prevent revenue leakage and automate approval workflows:
</p>
<div class="grid-2">
  <div class="feature-card">
    <h4>OCR & Metadata Extraction</h4>
    <p>Extracts deposited amount, transaction date/time, branch code, and reference numbers with confidence scoring.</p>
  </div>
  <div class="feature-card">
    <h4>Anti-Fraud & Tamper Detection</h4>
    <p>Flags digitally manipulated (Photoshop) receipts, font inconsistencies, and altered numbers.</p>
  </div>
  <div class="feature-card">
    <h4>Duplicate Receipt Detection</h4>
    <p>Prevents cross-student slip re-use by matching image hashes and reference numbers against historical submissions.</p>
  </div>
  <div class="feature-card">
    <h4>Bank Statement Reconciliation</h4>
    <p>Matches uploaded bank statement CSV feeds against approved student claims, verifying actual funds received.</p>
  </div>
</div>

<h2>9.2 Ledger Balancing & Installment Pricing</h2>
<ul>
  <li><strong>Excess & Arrears Management:</strong> Overpayments or underpayments are automatically credited or debited to the student's digital ledger balance.</li>
  <li><strong>Upgrade Pricing Matrix:</strong> Automatically calculates exact pro-rated price differentials when students upgrade from single subjects to multi-subject combo bundles.</li>
</ul>

<!-- SECTION 10 -->
<h1><span class="sec-num">10</span> Physical Institute CRM (Campus Operations)</h1>
<p>
  Manages on-premises physical campus branches, walk-in student registrations, RFID smart attendance, faculty revenue sharing, and counter cash registers.
</p>

<table>
  <thead>
    <tr>
      <th>Module</th>
      <th>Key Features & Capabilities</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>RFID Registration</strong></td>
      <td>Issues smart RFID cards linked to student profile, photo, school, grade, and guardian contact numbers.</td>
    </tr>
    <tr>
      <td><strong>Smart Attendance</strong></td>
      <td>Single-tap card scanning at branch turnstiles with automated real-time SMS/WhatsApp entry alerts dispatched to parents.</td>
    </tr>
    <tr>
      <td><strong>Faculty Management</strong></td>
      <td>Configurable institute commission percentages (Institute Cut %), hall utilization logs, and teacher payout payroll summaries.</td>
    </tr>
    <tr>
      <td><strong>Cashflow & Counter Register</strong></td>
      <td>Real-time tracking of on-site registration fees, daily petty cash disbursements, utility costs, and daily cash reconciliation.</td>
    </tr>
  </tbody>
</table>

<!-- SECTION 11 -->
<div class="page-break"></div>
<h1><span class="sec-num">11</span> Technical Department & Live Streaming</h1>
<p>
  Coordinates live broadcast infrastructure, studio allocations, Zoom account credential rotation, and secure anti-piracy video delivery.
</p>

<h2>11.1 Anti-Piracy Watermarked Video Player</h2>
<p>
  Live streams and recorded classes are rendered through an encrypted video player with a dynamic floating watermarking layer. The student's full name, telephone number, and IP address animate randomly across the screen, deterring and identifying unauthorized screen recording.
</p>

<h2>11.2 Zoom Multi-Account Provisioning</h2>
<p>
  Maintains a pool of Zoom OAuth API accounts, automatically provisioning live class meetings, managing concurrent attendee limits, and injecting live access links directly into student dashboards.
</p>

<!-- SECTION 12 -->
<h1><span class="sec-num">12</span> LUMI AI Suite (Autonomous AI Engines)</h1>
<p>
  The LUMI AI Suite integrates enterprise artificial intelligence across all core business operations:
</p>

<div class="grid-4">
  <div class="feature-card">
    <h4>LUMI Analyser</h4>
    <p>Predictive analytics forecasting cohort drop-off rates, future monthly revenue, and coordinator KPI benchmarks.</p>
  </div>
  <div class="feature-card">
    <h4>LUMI Chat</h4>
    <p>Smart NLP support bot providing instant, contextual answers to student inquiries 24/7.</p>
  </div>
  <div class="feature-card">
    <h4>LUMI Caller</h4>
    <p>Autonomous conversational voice agent conducting seminar reminder calls in natural Sinhala/English.</p>
  </div>
  <div class="feature-card">
    <h4>LUMI Image Studio</h4>
    <p>Generative marketing tool crafting high-resolution promotional banners and graphic assets.</p>
  </div>
</div>

<!-- SECTION 13 -->
<h1><span class="sec-num">13</span> Student Portal & Mobile App Ecosystem</h1>
<p>
  The public-facing student environment is optimized for seamless learning, secure video streaming, and parcel tracking.
</p>

<ul>
  <li><strong>Student Dashboard V2:</strong> Next-generation interface highlighting today's scheduled classes, live lecture join links, countdown timers, and campus announcements.</li>
  <li><strong>Delivery Tracking Hub:</strong> Live multi-stage parcel progress tracker (Order Approved &rarr; Packed &rarr; Dispatched &rarr; Out for Delivery).</li>
  <li><strong>Paycorp Payment Gateway:</strong> Multi-channel digital fee collection supporting Credit/Debit Cards, QR payments, and manual slip uploads.</li>
  <li><strong>Moderated Student Community Chat:</strong> Dedicated batch-level discussions featuring automated AI content moderation that removes inappropriate language in real time.</li>
</ul>

<!-- SECTION 14 -->
<h1><span class="sec-num">14</span> System Administration & Core Utilities</h1>

<div class="grid-2">
  <div class="feature-card">
    <h4>Ghost Mode (Security Impersonation)</h4>
    <p>Super Admins can log into any coordinator, manager, or staff account without a password for instant troubleshooting. An active red banner allows one-click return to the admin session.</p>
  </div>
  <div class="feature-card">
    <h4>System Issue & Bug Tracker</h4>
    <p>In-app reporting system allowing staff to log software glitches with screenshot attachments directly to system developers.</p>
  </div>
  <div class="feature-card">
    <h4>Global Refresh Engine</h4>
    <p>Instant cache clearing and real-time data synchronization triggerable across all client sessions simultaneously.</p>
  </div>
  <div class="feature-card">
    <h4>Personalization & HUD</h4>
    <p>Theme engine supporting Dark/Light modes, dynamic animated backgrounds (Live Sky, Color Shifts), and an embedded Spotify player for staff focus.</p>
  </div>
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

  const rootPdfPath = path.join('/root/IMA-Campus', 'IMA_Campus_Master_System_Specification.pdf');
  const backendPublicPdfPath = path.join('/root/IMA-Campus/backend/public', 'IMA_Campus_Master_System_Specification.pdf');
  const frontendPublicPdfPath = path.join('/root/IMA-Campus/frontend/public', 'IMA_Campus_Master_System_Specification.pdf');

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
      top: '18mm',
      bottom: '20mm',
      left: '14mm',
      right: '14mm'
    }
  });

  // Copy to public paths
  fs.copyFileSync(rootPdfPath, backendPublicPdfPath);
  fs.copyFileSync(rootPdfPath, frontendPublicPdfPath);

  console.log(`Master PDF successfully generated at:\n- ${rootPdfPath}\n- ${backendPublicPdfPath}\n- ${frontendPublicPdfPath}`);

  await browser.close();
}

generatePDF().catch(err => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
