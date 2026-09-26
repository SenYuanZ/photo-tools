import { normalizePublicBookingAiBrief } from './public-booking.utils';

describe('normalizePublicBookingAiBrief', () => {
  it('removes empty fields while preserving the submitted details', () => {
    expect(
      normalizePublicBookingAiBrief({
        themeType: 'cosplay',
        workName: ' 原神 ',
        characterName: '',
        outfit: '黑红色短裙',
      }),
    ).toEqual({
      themeType: 'cosplay',
      workName: '原神',
      outfit: '黑红色短裙',
    });
  });

  it('returns undefined when no usable detail is provided', () => {
    expect(
      normalizePublicBookingAiBrief({
        workName: ' ',
        characterName: '',
      }),
    ).toBeUndefined();
  });

  it('preserves the compact AI fields used by the public booking form', () => {
    expect(
      normalizePublicBookingAiBrief({
        themeType: 'jk',
        workName: ' JK校园感 ',
        outfit: '白衬衫、百褶裙、自然妆',
        visualGoal: '清爽、自然互动',
        avoid: '避免僵硬站姿',
      }),
    ).toEqual({
      themeType: 'jk',
      workName: 'JK校园感',
      outfit: '白衬衫、百褶裙、自然妆',
      visualGoal: '清爽、自然互动',
      avoid: '避免僵硬站姿',
    });
  });
});
