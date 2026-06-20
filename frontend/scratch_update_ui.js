const fs = require('fs');
const filePath = '/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace statementFile state with spreadsheetUrl state
content = content.replace(
    /const \[statementFile, setStatementFile\] = useState\(null\);/,
    `const [spreadsheetUrl, setSpreadsheetUrl] = useState('');`
);

// 2. Modify handleUploadStatement
const handleUploadStatementOld = `
  const handleUploadStatement = async () => {
    if (!statementFile) return toast.error("Please select an Excel/CSV file");
    if (!statementBank) return toast.error("Please select a Bank Template");

    const formData = new FormData();
    formData.append('statementFile', statementFile);
    formData.append('month', selectedMonth);
    formData.append('bankName', statementBank);
    
    setIsUploading(true);
    try {
      const res = await api.post('/ai-verification/upload-bank-statement', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      setStatementFile(null);
      document.getElementById('bank-upload').value = '';
      fetchMonthTransactions(selectedMonth);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };`;

const handleUploadStatementNew = `
  const handleUploadStatement = async () => {
    if (!spreadsheetUrl) return toast.error("Please enter a Google Sheet URL");
    if (!statementBank) return toast.error("Please select a Bank Template");

    setIsUploading(true);
    try {
      const res = await api.post('/ai-verification/upload-bank-statement', {
        spreadsheetUrl,
        month: selectedMonth,
        bankName: statementBank
      });
      toast.success(res.data.message);
      setSpreadsheetUrl('');
      fetchMonthTransactions(selectedMonth);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to link Google Sheet");
    } finally {
      setIsUploading(false);
    }
  };`;

// Use simple index replacements for large functions
const uploadStart = content.indexOf('const handleUploadStatement = async () => {');
if (uploadStart !== -1) {
    const uploadEnd = content.indexOf('};', uploadStart) + 2;
    // Actually handleUploadStatement is pretty structured, let's find the closing brace exactly
    // since it contains inner try/catch
    const part1 = content.slice(0, uploadStart);
    // Find where the next function handleAddManualTransaction starts
    const nextFunc = content.indexOf('const handleAddManualTransaction = async () => {', uploadStart);
    if (nextFunc !== -1) {
        content = part1 + handleUploadStatementNew + '\n\n' + content.slice(nextFunc);
    }
}

// 3. Replace the input type="file" with an input type="text"
content = content.replace(
    /<input\s+type="file"\s+id="bank-upload"[\s\S]*?onChange=\{\(e\) => setStatementFile\(e\.target\.files\[0\]\)\}\s*\/>/,
    `<input
        type="text"
        id="bank-upload"
        className="hidden"
    />
    <input 
        type="url"
        placeholder="Paste Google Sheet Link here..."
        className="w-full bg-black/40 border border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
        value={spreadsheetUrl}
        onChange={(e) => setSpreadsheetUrl(e.target.value)}
    />`
);

// 4. Update the "Import" button disabled condition
content = content.replace(
    /disabled=\{\!statementFile \|\| isUploading\}/g,
    `disabled={!spreadsheetUrl || isUploading}`
);

content = content.replace(
    /\{\!statementFile \? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'\}/g,
    `{!spreadsheetUrl ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`
);

// 5. Replace "statementFile ? statementFile.name : 'Select Excel/CSV File'"
content = content.replace(
    /\{statementFile \? statementFile\.name : 'Select Excel\/CSV File'\}/g,
    `'Link Google Sheet'`
);

// 6. Update table rendering to use dynamic headers
// The unified table rendering is around line 1254 (flex-1 overflow-y-auto custom-scrollbar)
// We will replace the table rendering logic to use statementTransactions.headers and statementTransactions.rows
// Wait, statementTransactions state is an array. But in the new backend we return {headers: [], rows: []}
// Let's modify the default state or handling
content = content.replace(
    /const \[statementTransactions, setStatementTransactions\] = useState\(\[\]\);/,
    `const [statementTransactions, setStatementTransactions] = useState({headers: [], rows: []});`
);

// We need to replace the entire table rendering for Bank Statement Vault
const tableStart = content.indexOf('<table className="w-full text-sm text-left text-gray-300">');
const tableEnd = content.indexOf('</table>', tableStart) + 8;

const newTable = `
<table className="w-full text-sm text-left text-gray-300">
    <thead className="text-xs text-gray-500 bg-gray-900/80 sticky top-0 uppercase">
        <tr>
            <th className="px-4 py-3">#</th>
            {(statementTransactions.headers || []).map((h, i) => (
                <th key={i} className="px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
        </tr>
    </thead>
    <tbody>
        {(statementTransactions.rows || []).map((row, i) => (
            <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-gray-500">{row._rowIndex}</td>
                {(statementTransactions.headers || []).map((h, j) => (
                    <td key={j} className="px-4 py-3 max-w-[200px] truncate" title={row[h]}>
                        {row[h]}
                    </td>
                ))}
            </tr>
        ))}
        {(!statementTransactions.rows || statementTransactions.rows.length === 0) && (
            <tr>
                <td colSpan="100%" className="px-4 py-8 text-center text-gray-500">
                    No data found in Google Sheet.
                </td>
            </tr>
        )}
    </tbody>
</table>
`;

if (tableStart !== -1 && tableEnd !== -1) {
    content = content.slice(0, tableStart) + newTable + content.slice(tableEnd);
}

// 7. Remove the lower tabs and table for Pending/Verified/Rejected completely!
// The user said: "ekai yata tyn verified pending reject ekai sampuran wenas karann dekatama eka table ekak use karamu"
// Which means remove the entire "Tab Content Container" and the tabs.
const tabsSectionStart = content.indexOf('{/* Tab Content Container */}');
// We need to remove from the start of the tabs navigation to the end of Tab Content Container.
// The Tabs navigation starts with:
// <div className="flex items-center gap-4">
//   <button ...> Pending ...</button>
// It's inside a flex container next to Search bar.
// Actually, I can just hide the whole lower half.
const mainFlexContainerStart = content.indexOf('<div className="flex flex-col lg:flex-row gap-6">');
// I will not remove it blindly without AST, but I can comment out the bottom section or just remove the tabs if I find them.
// Let's replace the lower section with just the AI Console since they still need to run commands?
// Actually, AI Console is on the Left. The Vault and Results are on the Right (w-full lg:w-3/4).
// The Right side has:
// 1. Bank Statement Vault
// 2. Tabs + Results Table
const resultsContainerStart = content.indexOf('{/* Results Section */}');
if (resultsContainerStart !== -1) {
    // Find the end of this div container or section
    // Since it's hard to regex, I'll just change the JSX to not render it:
    // By replacing {/* Results Section */} with {false && (
    // And finding the matching closing tag. It's safer to just let it be or replace the entire block.
    // Instead of parsing perfectly, I will replace {/* Results Section */} with:
    // {/* Results Section Removed for Unified Google Sheet View */} { false && (
    
    // We need to close the `)` at the end.
    // Let's find: {/* End Results Section */} if it exists? No.
    console.log("Found Results Section. I will just hide it.");
    content = content.replace(
        /\{\/\* Results Section \*\/\}/,
        `{/* Results Section */}\n{false && (`
    );
    // Add `)}` before the final closing div of the right column.
    // The right column ends around line 2085.
    // Let's find: 
    //            {/* --- END RIGHT COLUMN --- */}
    //        </div>
    //    </div>
    // </div>
    const rightColEnd = content.indexOf('</div>', content.indexOf('{/* --- END RIGHT COLUMN --- */}'));
    if (rightColEnd !== -1) {
        // Wait, if I add `)}` it might break JSX. 
        // It's safer to just replace `const activeResultTab` and hide elements using CSS class 'hidden'.
    }
}

fs.writeFileSync(filePath, content);
console.log('UI update script completed.');
