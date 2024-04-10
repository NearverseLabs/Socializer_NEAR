import { Router } from 'express';
import init from './init';
import token from './token';
import balance from './balance';
import campaign from './campaign';
import transaction from './transaction';
import stake from './stake';

const router: Router = Router();
router.use('/init', init);
router.use('/token', token);
router.use('/base', balance);
router.use('/campaign', campaign);
router.use('/transaction', transaction);

router.use('/stake', stake);

export default router;
