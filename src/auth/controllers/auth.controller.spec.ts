import { AuthController } from './auth.controller';

const mockAuthService = () => ({
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
});

describe('AuthController', () => {
  let controller: AuthController;
  let service: ReturnType<typeof mockAuthService>;

  beforeEach(() => {
    service = mockAuthService();
    controller = new AuthController(service as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should delegate to authService.register', async () => {
      const dto = { email: 'a@a.com', password: 'Admin@123' };
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      service.register.mockResolvedValue(expected);

      const result = await controller.register(dto as any);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should delegate to authService.login', async () => {
      const dto = { email: 'a@a.com', password: 'Admin@123' };
      const expected = { accessToken: 'at', refreshToken: 'rt' };
      service.login.mockResolvedValue(expected);

      const result = await controller.login(dto as any);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('refresh', () => {
    it('should delegate to authService.refresh', async () => {
      const dto = { refreshToken: 'old-rt' };
      const expected = { accessToken: 'new-at', refreshToken: 'new-rt' };
      service.refresh.mockResolvedValue(expected);

      const result = await controller.refresh(dto);

      expect(service.refresh).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
