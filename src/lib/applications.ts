import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const MAX_NUMBER_ATTEMPTS = 5;

/** Создаёт заявку со следующим номером. Две одновременные заявки разводятся повтором по unique. */
export async function createNumberedApplication(data: Omit<Prisma.ApplicationCreateInput, "number">) {
  for (let attempt = 1; ; attempt++) {
    const { _max } = await prisma.application.aggregate({ _max: { number: true } });
    try {
      return await prisma.application.create({ data: { ...data, number: (_max.number ?? 0) + 1 } });
    } catch (err) {
      const isNumberTaken = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isNumberTaken || attempt >= MAX_NUMBER_ATTEMPTS) throw err;
    }
  }
}

/** Номер для людей: «№12». Запасной вариант — для заявки, которая ещё не пронумерована. */
export function applicationLabel(app: { id: string; number: number | null }): string {
  return app.number ? `№${app.number}` : app.id.slice(0, 8);
}
