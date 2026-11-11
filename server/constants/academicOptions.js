export const STUDENT_DEPARTMENTS = [
    "Biotechnology",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science & Engg.",
    "Electrical Engineering",
    "Electronics & Communication Engineering",
    "Mechanical Engineering",
    "Metallurgical & Materials Engineering",
    "School Of Sciences",
    "School Of Humanities & Management"
];

export const STUDY_YEARS = [1, 2, 3, 4];

const departmentAliases = new Map([
    ["Computer Science & Engineering", "Computer Science & Engg."],
    ["Electrical & Electronics Engineering", "Electrical Engineering"],
    ["Information Technology", "Computer Science & Engg."],
    ["Applied Sciences", "School Of Sciences"],
    ["Management Studies", "School Of Humanities & Management"]
]);

export const normalizeDepartment = (department) => {
    const value = typeof department === "string" ? department.trim() : "";
    return departmentAliases.get(value) || value;
};

export const getDepartmentVariants = (department) => {
    const canonical = normalizeDepartment(department);
    return [canonical, ...[...departmentAliases.entries()]
        .filter(([, mapped]) => mapped === canonical)
        .map(([legacy]) => legacy)];
};
