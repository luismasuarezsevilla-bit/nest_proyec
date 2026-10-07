import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Table } from './modules/tables/entities/table.entity.js';
import { Reservation } from './modules/reservations/entities/reservation.entity.js';
import { ReservationsModule } from './modules/reservations/reservations.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { TablesModule } from './modules/tables/tables.module.js';
import { ProductModule } from './modules/product/product.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgrespassword',
      database: process.env.DB_DATABASE || 'restaurant_db',
      entities: [Table, Reservation],
      autoLoadEntities: true,
      synchronize: true, // Solo en desarrollo
    }),

    ReservationsModule,
    TablesModule,
    CategoriesModule,
    ProductModule,
    CustomersModule,
    TablesModule,
  ],
})
export class AppModule {}
