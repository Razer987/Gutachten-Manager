/**
 * @file apps/api/src/modules/audit/audit.controller.ts
 */
import type { Request, Response } from 'express';

import { auditService } from './audit.service';

export const auditController = {
  async list(req: Request, res: Response) {
    const logs = await auditService.list(req.params.gutachtenId);
    res.json({ success: true, data: logs });
  },
};
