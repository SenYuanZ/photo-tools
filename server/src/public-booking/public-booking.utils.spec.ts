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
});
