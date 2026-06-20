const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// Add state for showAnimation
if (!code.includes('const [showAnimation, setShowAnimation]')) {
    code = code.replace(
        /const \[isVerifying, setIsVerifying\] = useState\(false\);/,
        "const [isVerifying, setIsVerifying] = useState(false);\n  const [showAnimation, setShowAnimation] = useState(false);"
    );
}

// Modify runVerificationForSlips
code = code.replace(
    /const runVerificationForSlips = async \(slipsToVerify, isAutoDetect = false\) => \{\n\s*setIsVerifying\(true\);/,
    "const runVerificationForSlips = async (slipsToVerify, isAutoDetect = false) => {\n    setIsVerifying(true);\n    setShowAnimation(!isAutoDetect);"
);

// Modify the overlay condition
code = code.replace(
    /\{isVerifying && currentVerifyingSlip && createPortal\(/,
    "{isVerifying && showAnimation && currentVerifyingSlip && createPortal("
);

fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', code);
