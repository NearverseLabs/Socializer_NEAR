import { Router } from 'express';
import { V, Validator } from '../middleware/validation';
import auth from '../middleware/auth';
import { create, get, verify, getVerify, getWinners, getLeaderList, getPoster } from '../controllers/campaign';

const router: Router = Router();

router
    .route('/')
    .get(get)
    .post(V.body(Validator.Campaign.Create), create)
    .put(V.body(Validator.Campaign.Poster), getPoster);

router
    .route('/verify')
    .get(getVerify)
    .post(V.body(Validator.Campaign.Verify), verify);

router.get("/winners", getWinners);

router.get("/leader", getLeaderList);

export default router;
