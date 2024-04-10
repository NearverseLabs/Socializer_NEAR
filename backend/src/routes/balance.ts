import { Router } from 'express';
import { V, Validator } from '../middleware/validation';
import { getStatus, withdraw } from '../controllers/balance';

const router: Router = Router();

router
    .route('/withdraw')
    .post(V.body(Validator.Balance.Withdraw), withdraw);

router
    .route('/status')
    .get(getStatus);

export default router;
