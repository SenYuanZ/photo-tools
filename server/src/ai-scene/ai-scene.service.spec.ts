import { AiSceneService } from './ai-scene.service';

describe('AiSceneService.saveResult', () => {
  const makeService = () => {
    const repository = {
      findOne: jest.fn(),
      save: jest.fn((schedule: unknown) => schedule),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'longcat.model' ? 'test-model' : undefined,
      ),
    };
    const service = new AiSceneService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      config as never,
    );
    Object.defineProperty(service, 'buildContext', {
      value: jest.fn().mockResolvedValue({
        serviceType: 'photography',
        note: 'context',
      }),
    });
    return { repository, service };
  };

  it('caches an AI plan without changing the schedule note', async () => {
    const { repository, service } = makeService();
    const schedule = {
      id: 'schedule-1',
      userId: 'user-1',
      displayStatus: 'Y',
      note: '原有备注',
      serviceMeta: { source: 'public-model-booking' },
    };
    repository.findOne.mockResolvedValue(schedule);

    await service.saveResult('user-1', 'schedule-1', {
      scene: 'shoot_plan',
      result: { title: '胡桃拍摄方案', summary: '灵动感' },
      saveToNote: false,
    });

    expect(schedule.note).toBe('原有备注');
    expect(schedule.serviceMeta.aiPlan).toEqual(
      expect.objectContaining({
        scene: 'shoot_plan',
        result: { title: '胡桃拍摄方案', summary: '灵动感' },
      }),
    );
  });

  it('keeps the existing note append behavior when requested', async () => {
    const { repository, service } = makeService();
    const schedule = {
      id: 'schedule-1',
      userId: 'user-1',
      displayStatus: 'Y',
      note: '原有备注',
      serviceMeta: null,
    };
    repository.findOne.mockResolvedValue(schedule);

    await service.saveResult('user-1', 'schedule-1', {
      scene: 'shoot_plan',
      result: { title: '拍摄方案', summary: '现场执行' },
      saveToNote: true,
    });

    expect(schedule.note).toContain('原有备注');
    expect(schedule.note).toContain('【拍摄方案】 现场执行');
  });
});
