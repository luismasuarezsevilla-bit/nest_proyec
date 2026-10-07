import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import {
  CreateReservationDto,
  CustomerDataDto,
} from './dto/create-reservation.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';
import {
  Reservation,
  ReservationStatus,
} from './entities/reservation.entity.js';
import { Table } from '../tables/entities/table.entity.js';
import { Customer } from '../customers/entities/customer.entity.js';

const RESERVATION_DURATION_MINUTES = 120; // confirmar con el equipo

const toMinutes = (time: string) => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepository: Repository<Reservation>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateReservationDto) {
    const {
      customer_id,
      customer: customerData,
      table_id,
      time,
      guests,
      notes,
    } = dto;
    const date = dto.date.slice(0, 10);

    this.ensureNotInPast(date, time); // RN-043

    return this.dataSource.transaction(async (manager) => {
      // Bloquea la mesa: peticiones simultáneas sobre ella se ejecutan en fila
      const table = await this.lockTableAndCheckCapacity(
        manager,
        table_id,
        guests,
      ); // RN-045

      await this.ensureNoConflict(manager, table.id, date, time); // RN-044

      const customer = await this.resolveCustomer(
        manager,
        customer_id,
        customerData,
      ); // RN-046

      return manager.save(
        manager.create(Reservation, {
          customer_id: customer.id,
          table_id: table.id,
          date,
          time,
          guests,
          notes,
          status: ReservationStatus.PENDING, // RN-047
        }),
      );
    });
  }

  findAll() {
    return this.reservationsRepository.find();
  }

  async findOne(id: string) {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva con id ${id} no encontrada`);
    }

    return reservation;
  }

  async update(id: string, dto: UpdateReservationDto) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, { where: { id } });
      if (!reservation) {
        throw new NotFoundException(`Reserva con id ${id} no encontrada`);
      }

      const table_id = dto.table_id ?? reservation.table_id;
      const date = (dto.date ?? reservation.date).slice(0, 10);
      const time = dto.time ?? reservation.time;
      const guests = dto.guests ?? reservation.guests;

      if (dto.date || dto.time) {
        this.ensureNotInPast(date, time);
      }

      if (dto.customer_id) {
        await this.resolveCustomer(manager, dto.customer_id);
      }

      if (table_id) {
        await this.lockTableAndCheckCapacity(manager, table_id, guests);
        // Se excluye la propia reserva para que no choque consigo misma
        await this.ensureNoConflict(manager, table_id, date, time, id);
      }

      Object.assign(reservation, dto);
      return manager.save(reservation);
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.reservationsRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException(`Reserva con id ${id} no encontrada`);
    }
  }

  //  Validaciones internas 

  private async lockTableAndCheckCapacity(
    manager: EntityManager,
    table_id: string,
    guests: number,
  ) {
    const table = await manager.findOne(Table, {
      where: { id: table_id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!table) {
      throw new NotFoundException(`Mesa con id ${table_id} no encontrada`);
    }

    if (guests > table.capacity) {
      throw new BadRequestException(
        `La mesa tiene capacidad para ${table.capacity} personas y la reserva es para ${guests}`,
      );
    }

    return table;
  }

  private async resolveCustomer(
    manager: EntityManager,
    customer_id?: string,
    data?: CustomerDataDto,
  ) {
    if (customer_id) {
      const customer = await manager.findOne(Customer, {
        where: { id: customer_id },
      });
      if (!customer) {
        throw new NotFoundException(
          `Cliente con id ${customer_id} no encontrado`,
        );
      }
      return customer;
    }

    if (!data) {
      throw new BadRequestException(
        'Debes enviar customer_id o los datos del cliente',
      );
    }

    const existing = await manager.findOne(Customer, {
      where: { email: data.email },
    });
    return existing ?? manager.save(manager.create(Customer, data));
  }

  private async ensureNoConflict(
    manager: EntityManager,
    table_id: string,
    date: string,
    time: string,
    excludeId?: string,
  ) {
    const sameDay = await manager.find(Reservation, {
      where: {
        table_id,
        date,
        // Una reserva cancelada libera la mesa
        status: Not(ReservationStatus.CANCELLED),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    const start = toMinutes(time);
    const overlaps = sameDay.some((r) => {
      const other = toMinutes(r.time);
      return (
        start < other + RESERVATION_DURATION_MINUTES &&
        other < start + RESERVATION_DURATION_MINUTES
      );
    });

    if (overlaps) {
      throw new ConflictException('La mesa ya está reservada en ese horario');
    }
  }

  private ensureNotInPast(date: string, time: string) {
    const when = new Date(`${date.slice(0, 10)}T${time.slice(0, 5)}:00`);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      throw new BadRequestException(
        'La fecha y hora de la reserva deben ser futuras',
      );
    }
  }
}