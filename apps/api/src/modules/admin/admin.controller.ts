/**
 * @file apps/api/src/modules/admin/admin.controller.ts
 */
import { z } from 'zod';
import type { Request, Response } from 'express';

import { adminService } from './admin.service';

const ToggleFlagSchema = z.object({
  aktiv: z.boolean(),
});

export const adminController = {
  async getFeatureFlags(_req: Request, res: Response) {
    const flags = await adminService.getFeatureFlags();
    res.json({ success: true, data: flags });
  },

  async toggleFeatureFlag(req: Request, res: Response) {
    const { aktiv } = ToggleFlagSchema.parse(req.body);
    const flag = await adminService.toggleFeatureFlag(req.params.name, aktiv);
    res.json({ success: true, data: flag });
  },
};
