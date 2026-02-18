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
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema.omit({ userId: true }),
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.omit({ userId: true }).partial(),
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
    },
    bulkDelete: {
      method: 'POST' as const,
      path: '/api/products/bulk-delete' as const,
    },
    categories: {
      method: 'GET' as const,
      path: '/api/products/categories' as const,
    },
    withDetails: {
      method: 'GET' as const,
      path: '/api/products/with-details' as const,
    },
  },
  productPhotos: {
    list: {
      method: 'GET' as const,
      path: '/api/products/:productId/photos' as const,
    },
    upload: {
      method: 'POST' as const,
      path: '/api/products/:productId/photos' as const,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:productId/photos/:photoId' as const,
    },
  },
  productUnits: {
    list: {
      method: 'GET' as const,
      path: '/api/products/:productId/units' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/products/:productId/units' as const,
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:productId/units/:unitId' as const,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:productId/units/:unitId' as const,
    },
  },
  sessions: {
    list: {
      method: 'GET' as const,
      path: '/api/sessions' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/sessions' as const,
      input: insertSessionSchema.omit({ userId: true }),
    },
    get: {
      method: 'GET' as const,
      path: '/api/sessions/:id' as const,
    },
    complete: {
      method: 'POST' as const,
      path: '/api/sessions/:id/complete' as const,
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
        unitValues: z.string().optional(),
      }),
    },
  },
  recordPhotos: {
    upload: {
      method: 'POST' as const,
      path: '/api/sessions/:sessionId/records/:productId/photos' as const,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sessions/:sessionId/records/:productId/photos/:photoId' as const,
    },
  },
  roles: {
    me: {
      method: 'GET' as const,
      path: '/api/roles/me' as const,
    },
    list: {
      method: 'GET' as const,
      path: '/api/roles' as const,
    },
    set: {
      method: 'POST' as const,
      path: '/api/roles' as const,
      input: z.object({
        userId: z.string(),
        role: z.enum(["admin", "sku_manager", "stock_counter", "stock_counter_toko", "stock_counter_gudang"]),
      }),
    },
  },
  upload: {
    photo: {
      method: 'POST' as const,
      path: '/api/upload/photo/:productId' as const,
    },
    opnamePhoto: {
      method: 'POST' as const,
      path: '/api/upload/opname-photo/:sessionId/:productId' as const,
    },
    downloadZip: {
      method: 'POST' as const,
      path: '/api/sessions/:id/download-photos' as const,
    },
  },
  excel: {
    template: {
      method: 'GET' as const,
      path: '/api/excel/template' as const,
    },
    import: {
      method: 'POST' as const,
      path: '/api/excel/import' as const,
    },
    export: {
      method: 'GET' as const,
      path: '/api/excel/export' as const,
    },
    gudangTemplate: {
      method: 'POST' as const,
      path: '/api/excel/gudang-template' as const,
    },
    gudangExport: {
      method: 'POST' as const,
      path: '/api/excel/gudang-export' as const,
    },
    gudangImport: {
      method: 'POST' as const,
      path: '/api/excel/gudang-import' as const,
    },
  },
  staff: {
    list: {
      method: 'GET' as const,
      path: '/api/staff' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/staff' as const,
    },
    update: {
      method: 'PUT' as const,
      path: '/api/staff/:id' as const,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/staff/:id' as const,
    },
  },
  announcements: {
    list: {
      method: 'GET' as const,
      path: '/api/announcements' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/announcements' as const,
    },
    update: {
      method: 'PUT' as const,
      path: '/api/announcements/:id' as const,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/announcements/:id' as const,
    },
    uploadImage: {
      method: 'POST' as const,
      path: '/api/announcements/:id/image' as const,
    },
  },
  feedback: {
    list: {
      method: 'GET' as const,
      path: '/api/feedback' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/feedback' as const,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/feedback/:id' as const,
    },
  },
  motivation: {
    list: {
      method: 'GET' as const,
      path: '/api/motivation' as const,
    },
    create: {
      method: 'POST' as const,
      path: '/api/motivation' as const,
    },
    update: {
      method: 'PUT' as const,
      path: '/api/motivation/:id' as const,
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/motivation/:id' as const,
    },
  },
  categoryPriorities: {
    list: {
      method: 'GET' as const,
      path: '/api/category-priorities' as const,
    },
    set: {
      method: 'POST' as const,
      path: '/api/category-priorities' as const,
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
