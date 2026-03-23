/**
 * @file apps/api/src/modules/dashboard/dashboard.controller.ts
 */
import type { Request, Response } from 'express';

import { dashboardService } from './dashboard.service';

export const dashboardController = {
  async getStats(_req: Request, res: Response) {
    const stats = await dashboardService.getStats();
    res.json({ success: true, data: stats });
  },

  async getMonatsuebersicht(_req: Request, res: Response) {
    const data = await dashboardService.getMonatsuebersicht();
    res.json({ success: true, data });
  },

  async getFristen(_req: Request, res: Response) {
    const fristen = await dashboardService.getFristen();
    res.json({ success: true, data: fristen });
  },
};
