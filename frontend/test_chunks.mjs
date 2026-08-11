import fs from 'fs';
import { execSync } from 'child_process';

const original = fs.readFileSync('src/components/admin/AISlipVerification.jsx', 'utf-8');

// I'll replace everything after slips block with an empty div just to close the component
let test1 = original.substring(0, original.indexOf("{mainTab === 'history'")) + '</div></div></div></div></div>); }';
fs.writeFileSync('test1.jsx', test1);
try { execSync('npx eslint test1.jsx'); console.log("Before history OK"); } catch(e) { console.log(e.stdout.toString().split('\n').find(l=>l.includes('error'))); }

let test2 = original.substring(0, original.indexOf("{mainTab === 'slips'")) + '</div></div></div></div></div>); }';
fs.writeFileSync('test2.jsx', test2);
try { execSync('npx eslint test2.jsx'); console.log("Before slips OK"); } catch(e) { console.log(e.stdout.toString().split('\n').find(l=>l.includes('error'))); }

let test3 = original.substring(0, original.indexOf("{mainTab === 'vault'")) + '</div></div></div></div></div>); }';
fs.writeFileSync('test3.jsx', test3);
try { execSync('npx eslint test3.jsx'); console.log("Before vault OK"); } catch(e) { console.log(e.stdout.toString().split('\n').find(l=>l.includes('error'))); }

let test4 = original.substring(0, original.indexOf("{isVerifying && currentVerifyingSlip")) + '</div></div></div></div></div>); }';
fs.writeFileSync('test4.jsx', test4);
try { execSync('npx eslint test4.jsx'); console.log("Before isVerifying OK"); } catch(e) { console.log(e.stdout.toString().split('\n').find(l=>l.includes('error'))); }

