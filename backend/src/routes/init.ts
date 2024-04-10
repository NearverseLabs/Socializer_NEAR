import { Router } from 'express';
import { token, txhistory, initCron } from '../controllers/init';

const router: Router = Router();

router.get('/token', token);
router.get('/txhistory', txhistory);
router.get('/cron', initCron);

export default router;
