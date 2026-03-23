/**
 * @file apps/api/src/modules/audit/audit.routes.ts
 */
import { Router } from 'express';

import { asyncHandler } from '@/middleware/error.middleware';

import { auditController } from './audit.controller';

const router = Router({ mergeParams: true });

router.get('/', asyncHandler(auditController.list));

export { router as auditRouter };
