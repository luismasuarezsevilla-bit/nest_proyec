import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Customer } from '../../customers/entities/customer.entity.js';
import { Table } from '../../tables/entities/table.entity.js';

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  COMPLETED = 'COMPLETED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'customer_id',
    type: 'uuid',
  })
  customer_id!: string;

  @ManyToOne(() => Customer, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'customer_id',
  })
  customer!: Customer;

  @Column({
    name: 'table_id',
    type: 'uuid',
    nullable: true,
  })
  table_id?: string;

  @ManyToOne(() => Table, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'table_id',
  })
  table?: Table;
  @Column({
    type: 'date',
  })
  date!: string;

  @Column({
    type: 'time',
  })
  time!: string;

  @Column({
    type: 'int',
  })
  guests!: number;

  @Column({
    type: 'enum', // CAMBIE EL VARCHAR POR UN ENUM
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status!: ReservationStatus; // CAMBIE EL STRING POR  ReservationStatus PARA Q SE MUESTRE  PENDING = 'PEDNDING', CONFIRMED = 'CONFIRMED',CANCELLED = 'CANCELLED',COMPLETED = 'COMPLETED',

  @Column({
    type: 'text',
    nullable: true,
  })
  notes?: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  created_at!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updated_at!: Date;
}
