import React, { forwardRef } from 'react';

const PaymentReceiptTemplate = forwardRef(({ data }, ref) => {
    if (!data) return null;

    const {
        receiptNo = 'IMA-REC',
        issuedDate,
        amount = 0,
        method = 'Slip',
        paymentType = 'Monthly Full Payment',
        student = {},
        academic = {},
        subjects = []
    } = data;

    const formattedDate = issuedDate
        ? new Date(issuedDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
        : new Date().toLocaleDateString('en-GB');

    return (
        <div
            ref={ref}
            style={{
                width: '780px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                position: 'relative',
                fontFamily: "'Plus Jakarta Sans', 'Noto Sans Sinhala', -apple-system, BlinkMacSystemFont, sans-serif",
                color: '#1e293b',
                boxSizing: 'border-box'
            }}
        >
            {/* Top Color Accent Strip */}
            <div style={{ height: '8px', background: 'linear-gradient(90deg, #10b981 0%, #0284c7 50%, #6366f1 100%)' }} />

            <div style={{ padding: '34px 40px' }}>
                {/* Header Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '22px', borderBottom: '2px dashed #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img src="/logo.png" alt="IMA Logo" style={{ height: '52px', objectFit: 'contain' }} crossOrigin="anonymous" />
                        <div>
                            <h1 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: '0 0 3px 0' }}>
                                IMA INSTITUTE OF HIGHER EDUCATION
                            </h1>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 2px 0', lineHeight: 1.4 }}>
                                Malabe, Sri Lanka • Official Payment Acknowledgement
                            </p>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                                Hotline: 011 207 8888 / 077 299 1425 • Web: imacampus.online
                            </p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-block', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: '6px', marginBottom: '8px' }}>
                            Official Receipt
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                            {receiptNo}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Issued: {formattedDate}
                        </div>
                    </div>
                </div>

                {/* Status Banner */}
                <div style={{ margin: '18px 0', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '15px' }}>
                            ✓
                        </div>
                        <div>
                            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Payment Approved & Enrolled
                            </h4>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                Verified by Finance Department • Ref: SLIP-VERIFIED
                            </span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>
                            Total Paid Amount
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857' }}>
                            LKR {parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* 2-Column Information Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
                    {/* Student Info */}
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '16px 18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284c7', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            Student Information
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Student Name:</span>
                            <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{student.name || 'Student'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Contact Phone:</span>
                            <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{student.phone || '-'}</span>
                        </div>
                        {student.nic && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                <span style={{ color: '#64748b', fontWeight: 500 }}>Student NIC:</span>
                                <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{student.nic}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>District:</span>
                            <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{student.district || student.city || 'Sri Lanka'}</span>
                        </div>
                    </div>

                    {/* Academic Course Info */}
                    <div style={{ background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '16px 18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284c7', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                                <path d="M6 12v5c3 3 9 3 12 0v-5" />
                            </svg>
                            Academic Course Details
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Business / Stream:</span>
                            <span style={{ color: '#0284c7', fontWeight: 700, textAlign: 'right' }}>{academic.businessName || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Batch:</span>
                            <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{academic.batchName || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Billing Period:</span>
                            <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{academic.groupName || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>Payment Type:</span>
                            <span style={{ color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{paymentType} ({method})</span>
                        </div>
                    </div>
                </div>

                {/* Table Breakdown */}
                <div style={{ marginBottom: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ width: '40px', color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>#</th>
                                <th style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Subject & Lecturer Details</th>
                                <th style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Class Type</th>
                                <th style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Billing Month</th>
                                <th style={{ color: '#475569', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 16px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Fee (LKR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subjects.length > 0 ? (
                                subjects.map((sub, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '13px 16px', fontSize: '12px', color: '#64748b' }}>
                                            {String(idx + 1).padStart(2, '0')}
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '12px' }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', marginBottom: '2px' }}>
                                                {sub.name}
                                            </div>
                                            {sub.lecturerName && (
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                    Lecturer: {sub.lecturerName}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '12px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#e0f2fe', color: '#0369a1', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', border: '1px solid #bae6fd' }}>
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                                </svg>
                                                {sub.classType || academic.classType || 'Theory Class'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '12px', color: '#475569' }}>
                                            {academic.groupName || '-'}
                                        </td>
                                        <td style={{ padding: '13px 16px', fontSize: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                            {sub.price ? parseFloat(sub.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '13px 16px', fontSize: '12px', color: '#64748b' }}>01</td>
                                    <td style={{ padding: '13px 16px', fontSize: '12px' }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                                            {academic.groupName || academic.batchName || 'Course Enrollment Fee'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '13px 16px', fontSize: '12px' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#e0f2fe', color: '#0369a1', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', border: '1px solid #bae6fd' }}>
                                            {academic.classType || 'Theory Class'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '13px 16px', fontSize: '12px', color: '#475569' }}>
                                        {academic.groupName || '-'}
                                    </td>
                                    <td style={{ padding: '13px 16px', fontSize: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                                        {parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px 16px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            Receipt Status: <span style={{ color: '#166534', fontWeight: 700 }}>PAID IN FULL</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginRight: '12px' }}>Total Paid:</span>
                            <strong style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                LKR {parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* NON-REFUNDABLE NOTICE BAR */}
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400e' }}>
                            ගෙවන ලද පාඨමාලා ගාස්තු කිසිදු හේතුවක් මත ආපසු ගෙවනු හෝ වෙනත් පාඨමාලාවකට මාරු කරනු නොලැබේ.
                        </span>
                    </div>
                    <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', color: '#b45309', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '5px' }}>
                        NON-REFUNDABLE
                    </div>
                </div>

                {/* Footer Section */}
                <div style={{ paddingTop: '16px', borderTop: '2px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ maxWidth: '500px', fontSize: '10px', color: '#94a3b8', lineHeight: 1.5 }}>
                        <strong style={{ color: '#475569' }}>Official System Generated Receipt:</strong> This electronic receipt is automatically generated and certified by the IMA Campus Student Management System upon payment verification. No physical signature is required. <span style={{ color: '#b45309', fontWeight: 700 }}>All fees paid are strictly Non-Refundable & Non-Transferable.</span> Keep this document as your valid proof of enrollment for exam access and tute delivery.
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff' }}>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            DIGITALLY VERIFIED
                        </div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                            IMA Cloud LMS Auth
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
});

export default PaymentReceiptTemplate;
