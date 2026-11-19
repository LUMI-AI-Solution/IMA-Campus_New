// 🔒 SUBJECT ISOLATION (shared by web + mobile student course views)
// A course of ANOTHER subject (or Theory vs Paper) must never be merged into the requested course.
const normSubjectName = (n) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
const firstSubjectWord = (n) => normSubjectName(n).split(/[\s-]+/)[0] || '';
const isSameSubjectCourse = (a, b) => {
    if (!a || !b) return false;
    const at = parseInt(a.courseType || 1, 10);
    const bt = parseInt(b.courseType || 1, 10);
    if (at !== bt) return false;
    const an = normSubjectName(a.name);
    const bn = normSubjectName(b.name);
    if (an && bn && an === bn) return true;
    const ac = String(a.code || '').trim().toLowerCase();
    const bc = String(b.code || '').trim().toLowerCase();
    if (ac && bc && ac === bc && firstSubjectWord(a.name) === firstSubjectWord(b.name)) return true;
    return false;
};
module.exports = { isSameSubjectCourse };
