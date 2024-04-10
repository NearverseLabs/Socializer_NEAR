import { Router } from 'express';
import { V, Validator } from '../middleware/validation';
import { get } from '../controllers/transaction';

const router: Router = Router();

router
    .route('/')
    .get(get);

router
    .route('/callback');

export default router;
