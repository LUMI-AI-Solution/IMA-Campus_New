// Login nathuwa open wenna ONA routes tika (hithamathama public ewa).
//
// Aluth route ekak methanata danne "meka login nathuwa open wenna ona" kiyala
// hithala thiranaya kalama witharai. Test eka fail una kiyala methanata
// danna epa: bohowita hari fix eka route ekata verifyToken dana eka.

module.exports = [
    // Login / register
    'POST /api/auth/login',
    'POST /api/auth/register',

    // Payment gateway eken ena notification eka (md5 signature eken check wenawa)
    'POST /api/student/payhere-notify',

    // WhatsApp / Meta webhooks (Meta eken ena ewa, token ekak ewanna be)
    'GET /api/admin/whatsapp-call/webhook',
    'POST /api/admin/whatsapp-call/webhook',
    'GET /api/coordinator-crm/webhook',
    'POST /api/coordinator-crm/webhook',
    'GET /api/after-seminar-crm/webhook',
    'POST /api/after-seminar-crm/webhook',

    // WhatsApp group join redirect links
    'GET /join',
    'GET /join/:campaign',
    'GET /api/join',
    'GET /api/join/:campaign',
];

// Me prefix walin patan ganna okkoma public (landing page, web forms).
module.exports.publicPrefixes = [
    '/api/public/',
];
