import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { productAvailability, productStatus } from '../enum/interface.js';
import { Category } from '../../categories/entities/category.entity.js';

// Product entity definition with TypeORM decorators
@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: 'category_id' })
  category: Relation<Category>;

  @Column({
    type: 'enum',
    enum: productAvailability,
    default: productAvailability.AVAILABLE,
  })
  availability: productAvailability;

  @Column({
    type: 'enum',
    enum: productStatus,
    default: productStatus.ACTIVE,
  })
  status: productStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
