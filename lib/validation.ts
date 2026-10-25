import { z } from "zod"

export const unitSchema = z.enum(["cx", "kg", "sc", "bdj", "dz", "un"])

export const stockItemSchema = z.object({
  reduzido: z.string().trim().regex(/^\d+$/, "Código reduzido inválido.").max(30),
  descricao: z.string().trim().min(2).max(180),
  palletTotal: z.coerce.number().finite().min(0).max(100000),
  lastro: z.coerce.number().finite().min(0).max(100000),
  unidade: z.boolean().optional().default(false),
  tipoUnidade: unitSchema.optional().default("cx"),
  taraKg: z.coerce.number().finite().min(0).max(10000).optional().default(0),
  pesoKg: z.coerce.number().finite().min(0).max(100000).optional().default(0),
})

export const countItemSchema = z.object({
  reduzido: z.string().trim().max(30),
  descricao: z.string().trim().max(180),
  pallets: z.string().max(80).optional(),
  lastros: z.string().max(80).optional(),
  fardos: z.string().max(80).optional(),
  unidades: z.string().max(80).optional(),
  pickingPallets: z.string().max(80).optional(),
  pickingLastros: z.string().max(80).optional(),
  pickingFardos: z.string().max(80).optional(),
  pickingUnidades: z.string().max(80).optional(),
  avariaPallets: z.string().max(80).optional(),
  avariaLastros: z.string().max(80).optional(),
  avariaFardos: z.string().max(80).optional(),
  avariaUnidades: z.string().max(80).optional(),
  faltante: z.boolean().optional(),
  quantidadeTotal: z.coerce.number().finite().min(0).max(100000).optional(),
})

export const stockRecordSchema = z.object({
  scope: z.enum(["filial", "matriz"]),
  date: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data inválida."),
  contador: z.string().trim().min(2).max(120),
  items: z.array(countItemSchema).min(1).max(1000),
})

export const lossSchema = z.object({
  id: z.string().trim().min(1).max(100).optional(),
  category: z.enum(["puxada", "passagem", "armazem", "deterioracao"]),
  items: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    name: z.string().trim().min(2).max(180),
    weightKg: z.coerce.number().finite().positive().max(100000),
    grossWeightKg: z.coerce.number().finite().nonnegative().max(100000).optional(),
    boxesCount: z.coerce.number().int().nonnegative().max(100000).optional(),
    tarePerBoxKg: z.coerce.number().finite().nonnegative().max(10000).optional(),
  })).min(1).max(200),
  observation: z.string().trim().max(2000).optional().default(""),
  operatorName: z.string().trim().max(120).optional(),
  date: z.string().trim().max(40).optional(),
  status: z.enum(["sent", "pending", "error"]).optional().default("sent"),
  timestamp: z.coerce.number().int().positive().optional(),
  photo: z.string().max(5_000_000).optional(),
})
