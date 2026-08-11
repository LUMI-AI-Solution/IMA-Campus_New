const raw = "_zm_ssid=aw1_c_VQFnWRSmTi2WICKzv0Jcew; Domain=.zoom.us; Path=/; Secure; _zm_ctaid=XoFweZ6xTSyN7BJrvZqRDQ.1782546561330.0f187d9815d38f1c3dbcbe4df1e587cd; Domain=.zoom.us; Path=/; Secure; Expires=1782553761;";

function parseCookies(cookieString) {
    if (!cookieString) return '';
    return cookieString.split(';')
        .map(c => c.trim())
        .filter(c => {
            const low = c.toLowerCase();
            return !low.startsWith('domain=') && 
                   !low.startsWith('path=') && 
                   !low.startsWith('expires=') && 
                   low !== 'secure' && 
                   low !== 'httponly';
        })
        .join('; ');
}

console.log(parseCookies(raw));
