import { Test, TestingModule } from '@nestjs/testing';
import { TablesController } from './tables.controller.js';
import { TablesService } from './tables.service.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { jest } from '@jest/globals';

describe('TablesController', () => {
  let controller: TablesController;
  let service: TablesService;

  const mockTableId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTable = {
    id: mockTableId,
    number: 1,
    capacity: 4,
    zone: 'Terraza',
  };

  // Creamos el mock del servicio con todos los métodos usados por el controlador

  beforeEach(async () => {
    const mockTablesService = {
      create: jest.fn().mockImplementation(async () => mockTable),
      findAll: jest.fn().mockImplementation(async () => [mockTable]),
      findOne: jest.fn().mockImplementation(async () => mockTable),
      update: jest
        .fn()
        .mockImplementation(async () => ({ ...mockTable, capacity: 6 })),
      remove: jest.fn().mockImplementation(async () => undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [
        {
          provide: TablesService,
          useValue: mockTablesService,
        },
      ],
    }).compile();

    controller = module.get<TablesController>(TablesController);
    service = module.get<TablesService>(TablesService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('debe crear una mesa', async () => {
      const dto: CreateTableDto = { number: 1, capacity: 4, zone: 'Terraza' };
      const result = await controller.create(dto);

      expect(jest.spyOn(service, 'create')).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTable);
    });
  });

  describe('findAll', () => {
    it('debe retornar un arreglo de mesas', async () => {
      const result = await controller.findAll();

      expect(jest.spyOn(service, 'findAll')).toHaveBeenCalled();
      expect(result).toEqual([mockTable]);
    });
  });

  describe('findOne', () => {
    it('debe retornar una mesa por ID', async () => {
      const result = await controller.findOne(mockTableId);

      expect(jest.spyOn(service, 'findOne')).toHaveBeenCalledWith(mockTableId);
      expect(result).toEqual(mockTable);
    });
  });

  describe('update', () => {
    it('debe actualizar una mesa', async () => {
      const dto: UpdateTableDto = { capacity: 6 };
      const result = await controller.update(mockTableId, dto);

      expect(jest.spyOn(service, 'update')).toHaveBeenCalledWith(
        mockTableId,
        dto,
      );
      expect(result).toEqual({ ...mockTable, capacity: 6 });
    });
  });

  describe('remove', () => {
    it('debe eliminar una mesa', async () => {
      const result = await controller.remove(mockTableId);

      expect(jest.spyOn(service, 'remove')).toHaveBeenCalledWith(mockTableId);
      expect(result).toBeUndefined();
    });
  });
});
