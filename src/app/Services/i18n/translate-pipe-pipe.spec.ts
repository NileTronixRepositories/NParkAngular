import { TranslatePipePipe } from './translate-pipe-pipe';

describe('TranslatePipePipe', () => {
  it('create an instance', () => {
    const pipe = new TranslatePipePipe({ translate: () => '' } as any, { ar: {}, en: {} } as any);
    expect(pipe).toBeTruthy();
  });
});
