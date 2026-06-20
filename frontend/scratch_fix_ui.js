const fs = require('fs');
const filePath = '/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx';

// Since the file is messed up, I will restore it from Git, then apply the right changes.
const { execSync } = require('child_process');
execSync('git checkout /root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', { stdio: 'inherit' });

let content = fs.readFileSync(filePath, 'utf8');

// 1. statementFile -> spreadsheetUrl
content = content.replace(
    /const \[statementFile, setStatementFile\] = useState\(null\);/,
    `const [spreadsheetUrl, setSpreadsheetUrl] = useState('');`
);

// 2. statementTransactions state to object
content = content.replace(
    /const \[statementTransactions, setStatementTransactions\] = useState\(\[\]\);/,
    `const [statementTransactions, setStatementTransactions] = useState({headers: [], rows: []});`
);

// 3. fetchMonthTransactions
content = content.replace(
    /setStatementTransactions\(Array\.isArray\(res\.data\) \? res\.data : \[\]\);/,
    `setStatementTransactions(res.data || {headers: [], rows: []});`
);

// 4. handleUploadStatement
const uploadOld = `  const handleUploadStatement = async () => {
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
const uploadNew = `  const handleUploadStatement = async () => {
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
content = content.replace(uploadOld, uploadNew);

// 5. Replace input
const fileInputOld = `<input 
                                    type="file" 
                                    id="bank-upload"
                                    accept=".csv, .xlsx, .xls"
                                    className="hidden" 
                                    onChange={(e) => setStatementFile(e.target.files[0])}
                                />
                                <label htmlFor="bank-upload" className="cursor-pointer text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-md border border-gray-700 flex items-center gap-2 truncate max-w-[200px]">
                                    <Upload size={14} /> {statementFile ? statementFile.name : "Select Excel"}
                                </label>`;
const fileInputNew = `<input 
                                    type="url"
                                    placeholder="Paste Google Sheet Link..."
                                    className="w-full bg-black/40 border border-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500"
                                    value={spreadsheetUrl}
                                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                                />`;
content = content.replace(fileInputOld, fileInputNew);

// 6. Replace disabled logic
content = content.replace(/disabled=\{\!statementFile \|\| isUploading\}/, `disabled={!spreadsheetUrl || isUploading}`);
content = content.replace(/\{\!statementFile \? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'\}/, `{!spreadsheetUrl ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`);
content = content.replace(/\{isUploading \? <Loader size=\{14\} className="animate-spin" \/> : "Import"\}/, `{isUploading ? <Loader size={14} className="animate-spin" /> : "Link Sheet"}`);

// 7. Rebuild the Table
const tableOldRegex = /<table className="w-full text-sm text-left text-gray-300">[\s\S]*?<\/table>/;
const tableNew = `<table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-500 bg-gray-900/80 sticky top-0 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-800">#</th>
                                        {(statementTransactions.headers || []).map((h, i) => (
                                            <th key={i} className="px-4 py-3 whitespace-nowrap border-b border-gray-800">{h}</th>
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
                            </table>`;
content = content.replace(tableOldRegex, tableNew);

// 8. Hide the Tab Content Container for Results Section
content = content.replace(/\{\/\* Results Section \*\/\}/, `{/* Results Section */}\n{false && (`);

// To avoid syntax error, we must close the parenthesis `)}`
// The Results Section ends at {/* --- END RIGHT COLUMN --- */}
// We can insert `)}` right before `{/* --- END RIGHT COLUMN --- */}`
content = content.replace(/\{\/\* --- END RIGHT COLUMN --- \*\/\}/, `)}\n{/* --- END RIGHT COLUMN --- */}`);

fs.writeFileSync(filePath, content);
console.log('Restored and successfully updated UI.');
