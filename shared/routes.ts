import { z } from 'zod';
import { insertProductSchema, insertSessionSchema, products, opnameSessions, opnameRecords, userRoles } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.omit({ userId: true }).partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    categories: {
      method: 'GET' as const,
      path: '/api/products/categories' as const,
      responses: {
        200: z.array(z.string()),
      },
    },
  },
  sessions: {
    list: {
      method: 'GET' as const,
      path: '/api/sessions' as const,
      responses: {
        200: z.array(z.custom<typeof opnameSessions.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sessions' as const,
      input: insertSessionSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof opnameSessions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sessions/:id' as const,
      responses: {
        200: z.custom<typeof opnameSessions.$inferSelect & { records: (typeof opnameRecords.$inferSelect & { product: typeof products.$inferSelect })[] }>(),
        404: errorSchemas.notFound,
      },
    },
    complete: {
      method: 'POST' as const,
      path: '/api/sessions/:id/complete' as const,
      responses: {
        200: z.custom<typeof opnameSessions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  records: {
    update: {
      method: 'POST' as const,
      path: '/api/sessions/:sessionId/records' as const,
      input: z.object({
        productId: z.number(),
        actualStock: z.number(),
        notes: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof opnameRecords.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  roles: {
    me: {
      method: 'GET' as const,
      path: '/api/roles/me' as const,
      responses: {
        200: z.custom<typeof userRoles.$inferSelect>(),
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/roles' as const,
      responses: {
        200: z.array(z.object({
          userId: z.string(),
          role: z.string(),
          email: z.string().nullable().optional(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
        })),
      },
    },
    set: {
      method: 'POST' as const,
      path: '/api/roles' as const,
      input: z.object({
        userId: z.string(),
        role: z.enum(["admin", "sku_manager", "stock_counter"]),
      }),
      responses: {
        200: z.custom<typeof userRoles.$inferSelect>(),
        403: errorSchemas.validation,
      },
    },
  },
  upload: {
    photo: {
      method: 'POST' as const,
      path: '/api/upload/photo/:productId' as const,
      responses: {
        200: z.object({ url: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
