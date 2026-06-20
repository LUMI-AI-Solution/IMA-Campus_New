const fs = require('fs');
const filePath = '/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx';

let content = fs.readFileSync(filePath, 'utf8');

const tableStart = content.indexOf('<table className="w-full text-sm text-left text-gray-300">');
// Find the end of the table by looking for </table> after tableStart
const tableEnd = content.indexOf('</table>', tableStart) + 8;

const newTable = `<table className="w-full text-sm text-left text-gray-300">
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

if (tableStart !== -1 && tableEnd !== -1) {
    content = content.slice(0, tableStart) + newTable + content.slice(tableEnd);
    fs.writeFileSync(filePath, content);
    console.log("Table successfully replaced.");
} else {
    console.log("Table start or end not found.");
}
