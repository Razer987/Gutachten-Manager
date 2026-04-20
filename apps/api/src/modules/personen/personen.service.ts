/**
 * @file apps/api/src/modules/personen/personen.service.ts
 */
import { prisma } from '@gutachten/database';
import { notFound } from '../../middleware/error.middleware';
import type { CreatePersonDto, UpdatePersonDto } from './personen.validators';

export const personenService = {
  async list(gutachtenId: string) {
    return prisma.person.findMany({
      where: { gutachtenId },
      orderBy: { createdAt: 'asc' },
      include: { fahrzeug: { select: { id: true, kennzeichen: true, marke: true, modell: true } } },
    });
  },

  async findById(gutachtenId: string, id: string) {
    const person = await prisma.person.findFirst({
      where: { id, gutachtenId },
      include: { fahrzeug: true },
    });
    if (!person) { throw notFound('Person', id); }
    return person;
  },

  async create(gutachtenId: string, dto: CreatePersonDto) {
    const gutachten = await prisma.gutachten.findUnique({ where: { id: gutachtenId }, select: { id: true } });
    if (!gutachten) { throw notFound('Gutachten', gutachtenId); }
    return prisma.person.create({
      data: {
        gutachtenId,
        ...dto,
        geburtsdatum: dto.geburtsdatum ? new Date(dto.geburtsdatum) : null,
      },
    });
  },

  async update(gutachtenId: string, id: string, dto: UpdatePersonDto) {
    const existing = await prisma.person.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Person', id); }
    return prisma.person.update({
      where: { id },
      data: {
        ...dto,
        geburtsdatum: dto.geburtsdatum ? new Date(dto.geburtsdatum) : undefined,
      },
    });
  },

  async delete(gutachtenId: string, id: string) {
    const existing = await prisma.person.findFirst({ where: { id, gutachtenId }, select: { id: true } });
    if (!existing) { throw notFound('Person', id); }
    await prisma.person.delete({ where: { id } });
    return { message: 'Person wurde gelöscht.' };
  },
};
