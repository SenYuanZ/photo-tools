export const normalizeUploadUrl = (value?: string | null): string => {
  if (!value) {
    return '';
  }

  if (value.startsWith('/uploads/')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    return value;
  }

  return value;
};

export const normalizeUploadUrls = (values?: string[] | null): string[] => {
  if (!values?.length) {
    return [];
  }

  return values.map((value) => normalizeUploadUrl(value)).filter(Boolean);
};
