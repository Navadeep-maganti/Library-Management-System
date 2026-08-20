export const validateEmailDomain = (email, role) => {
    if (!email || !role) {
        return false;
    }
    if (role.toLowerCase() == "student") {
        return email.endsWith('@student.nitandhra.ac.in');
    }
    else if (role.toLowerCase() == 'librarian') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && !email.endsWith('@student.nitandhra.ac.in');
    }
    else {
        return false;
    }
}

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
