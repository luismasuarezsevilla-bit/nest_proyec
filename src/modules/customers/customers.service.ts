import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { Customer } from './entities/customer.entity.js';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto) {
    const existingCustomer = await this.customerRepository.findOne({
      where: {
        email: createCustomerDto.email,
      },
    });
    if (existingCustomer) {
      throw new ConflictException('El email ya esta registrado');
    }
    const customer = this.customerRepository.create(createCustomerDto);

    return this.customerRepository.save(customer);
  }

  findAll() {
    return this.customerRepository.find();
  }

  findOne(id: string) {
    return this.customerRepository.findOneBy({ id });
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    if (updateCustomerDto.email) {
      const existingCustomer = await this.customerRepository.findOne({
        where: {
          email: updateCustomerDto.email,
        },
      });

      if (existingCustomer && existingCustomer.id !== id) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    await this.customerRepository.update(id, updateCustomerDto);

    return this.customerRepository.findOneBy({ id });
  }

  async remove(id: string) {
    const customer = await this.customerRepository.findOneBy({ id });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    await this.customerRepository.delete(id);

    return {
      message: 'Cliente eliminado correctamente',
    };
  }
}
