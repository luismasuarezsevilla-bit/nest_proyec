import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { Category } from './entities/category.entity.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name.trim();

    const existingCategory = await this.categoryRepository.findOne({
      where: {
        name: ILike(name),
      },
    });

    if (existingCategory) {
      throw new ConflictException({
        message: 'El nombre de la categoría ya está registrado',
        errorCode: 'CATEGORY_NAME_ALREADY_EXISTS',
      });
    }

    const newCategory = this.categoryRepository.create({
      name,
      description: createCategoryDto.description,
      status: createCategoryDto.status,
    });

    try {
      return await this.categoryRepository.save(newCategory);
    } catch (error) {
      if (this.isDuplicateError(error)) {
        throw new ConflictException({
          message: 'El nombre de la categoría ya está registrado',
          errorCode: 'CATEGORY_NAME_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }

  async findAll() {
    return await this.categoryRepository.find();
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOneBy({
      id,
    });

    if (!category) {
      throw new NotFoundException({
        message: `La categoría con ID ${id} no existe`,
        errorCode: 'CATEGORY_NOT_FOUND',
      });
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (updateCategoryDto.name !== undefined) {
      const name = updateCategoryDto.name.trim();

      const existingCategory = await this.categoryRepository.findOne({
        where: {
          name: ILike(name),
        },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException({
          message: 'El nombre de la categoría ya está registrado',
          errorCode: 'CATEGORY_NAME_ALREADY_EXISTS',
        });
      }

      updateCategoryDto.name = name;
    }

    this.categoryRepository.merge(category, updateCategoryDto);

    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (this.isDuplicateError(error)) {
        throw new ConflictException({
          message: 'El nombre de la categoría ya está registrado',
          errorCode: 'CATEGORY_NAME_ALREADY_EXISTS',
        });
      }

      throw error;
    }
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    return await this.categoryRepository.remove(category);
  }

  private isDuplicateError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
