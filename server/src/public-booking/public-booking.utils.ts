import type { PublicBookingAiBriefDto } from './dto/create-public-booking.dto';

export const normalizePublicBookingAiBrief = (
  brief?: PublicBookingAiBriefDto,
): Record<string, string> | undefined => {
  if (!brief) return undefined;

  const normalized = Object.entries(brief).reduce<Record<string, string>>(
    (result, [key, value]) => {
      if (typeof value !== 'string') return result;
      const trimmed = value.trim();
      if (trimmed) result[key] = trimmed;
      return result;
    },
    {},
  );

  return Object.keys(normalized).length ? normalized : undefined;
};
