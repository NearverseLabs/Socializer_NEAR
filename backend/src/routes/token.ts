import { Router } from 'express';
import { V, Validator } from '../middleware/validation';
import { get } from '../controllers/token';

const router: Router = Router();

router
    .route('/')
    .get(get);

export default router;
