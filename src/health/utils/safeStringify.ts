export const safeStringify = (value: unknown, maxLength = 3000): string => {
  try {
    const text = JSON.stringify(value, null, 2);
    if (text.length > maxLength) {
      return `${text.slice(0, maxLength)}... (truncated)`;
    }
    return text;
  } catch {
    return "[Error stringifying object]";
  }
};
