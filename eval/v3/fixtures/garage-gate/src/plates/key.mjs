// The key of a plate. See docs/plates.md.
export const plateKey = (text) => text.trim().toUpperCase().replace(/[\s-]+/g, '-');
