const TRUSTED_DIGITAL_HOSTS = [
    "archive.org",
    "gutenberg.org",
    "openstax.org",
    "ocw.mit.edu"
];

export const validateDigitalUrl = (value) => {
    if (!value) return null;
    if (typeof value !== "string") return undefined;
    try {
        const url = new URL(value.trim());
        const isTrusted = url.protocol === "https:" && TRUSTED_DIGITAL_HOSTS.some(
            (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
        );
        return isTrusted ? url.toString() : undefined;
    } catch {
        return undefined;
    }
};
